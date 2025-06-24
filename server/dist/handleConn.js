import { verifyToken } from './utils/jwt.js';
import { addClient, removeClient } from './services/clients.js';
import { addSocketToRoom, getRoom, removeSocketFromRoom } from './services/rooms.js';
import { addMessage } from './services/messages.js';
export async function handleConn(socket) {
    const authHeader = socket.handshake.headers['authorization'] || '';
    if (!authHeader.startsWith('Bearer ')) {
        console.error('Authorization header missing or invalid format');
        socket.disconnect(true);
        return;
    }
    const token = authHeader.split(' ').slice(1).join(' ');
    try {
        const userId = await verifyToken(token);
        if (!userId) {
            socket.disconnect(true);
            return;
        }
        socket.userId = userId;
    }
    catch (error) {
        console.error('Token verification error:', error);
        socket.disconnect(true);
        return;
    }
    addClient(socket.userId, socket.id);
    socket.on('disconnect', () => {
        removeClient(socket.id);
        console.log(`Socket ${socket.id} disconnected`);
    });
    socket.on('joinRoom', (roomId) => {
        if (!roomId) {
            console.error('Room ID is required to join a room');
            return;
        }
        const room = getRoom(roomId);
        if (!room) {
            console.error(`Room with ID ${roomId} does not exist`);
            return;
        }
        if (room.socketIds.has(socket.id)) {
            console.warn(`Socket ${socket.id} is already in room ${roomId}`);
            return;
        }
        addSocketToRoom(roomId, socket.id, socket.userId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
        socket.join(roomId);
    });
    socket.on('leaveRoom', (roomId) => {
        if (!roomId) {
            console.error('Room ID is required to leave a room');
            return;
        }
        const room = getRoom(roomId);
        if (!room) {
            console.error(`Room with ID ${roomId} does not exist`);
            return;
        }
        if (!room.socketIds.has(socket.id)) {
            console.warn(`Socket ${socket.id} is not in room ${roomId}`);
            return;
        }
        removeSocketFromRoom(roomId, socket.id);
        console.log(`Socket ${socket.id} left room ${roomId}`);
        socket.leave(roomId);
    });
    socket.on('message', (roomId, message) => {
        if (!roomId || !message) {
            console.error('Room ID and message content are required');
            return;
        }
        const room = getRoom(roomId);
        if (!room) {
            console.error(`Room with ID ${roomId} does not exist`);
            return;
        }
        if (!room.socketIds.has(socket.id)) {
            console.warn(`Socket ${socket.id} is not in room ${roomId}`);
            return;
        }
        console.log(`Message from socket ${socket.id} in room ${roomId}: ${message}`);
        const msgObj = {
            roomId,
            senderId: socket.userId,
            senderName: socket.userName || 'Anonymous',
            content: message,
            timestamp: Date.now()
        };
        socket.to(roomId).emit('message', msgObj);
        addMessage(msgObj);
    });
}
