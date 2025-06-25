import { verifyToken } from './utils/jwt.js';
import { MySocket } from './types.js';
import { addClient, removeClient } from './services/clients.js';
import { addSocketToRoom, getRoom, removeSocketFromRoom } from './services/rooms.js';
import { addMessage, Message } from './services/messages.js';

export async function handleConn(socket: MySocket) {
  const authHeader = socket.handshake.headers['authorization'] || '';

  if (!authHeader.startsWith('Bearer ')) {
    console.error('Authorization header missing or invalid format');
    socket.disconnect(true);
    return;
  }

  const token = authHeader.split(' ').slice(1).join(' ');

  try {
    const user = await verifyToken(token)

    if (!user) {
      socket.disconnect(true);
      return;
    }

    socket.userId = user.userId;
    socket.name = user.name
  } catch (error) {
    console.error('Token verification error:', error);
    socket.disconnect(true);
    return;
  }

  addClient(socket);

  socket.on('disconnect', () => {
    removeClient(socket)

    console.log(`Socket ${socket.id} disconnected`);
  });

  socket.on('joinRoom', async (roomId: string) => {
    if (!roomId) {
      console.error('Room ID is required to join a room');
      return;
    }

    const room = await getRoom(socket.db!, roomId);

    if (!room) {
      console.error(`Room with ID ${roomId} does not exist`);
      return;
    }

    if (room.sockets.has(socket)) {
      console.warn(`Socket ${socket.id} is already in room ${roomId}`);
      return;
    }

    addSocketToRoom(socket, roomId);

    console.log(`Socket ${socket.id} joined room ${roomId}`);

    socket.join(roomId);
  })

  socket.on('leaveRoom', async (roomId: string) => {
    if (!roomId) {
      console.error('Room ID is required to leave a room');
      return;
    }

    const room = await getRoom(socket.db!, roomId);

    if (!room) {
      console.error(`Room with ID ${roomId} does not exist`);
      return;
    }

    if (!room.sockets.has(socket)) {
      console.warn(`Socket ${socket.id} is not in room ${roomId}`);
      return;
    }

    removeSocketFromRoom(socket, roomId);

    console.log(`Socket ${socket.id} left room ${roomId}`);

    socket.leave(roomId);
  });

  socket.on('message', async (roomId: string, message: string) => {
    if (!roomId || !message) {
      console.error('Room ID and message content are required');
      return;
    }

    const room = await getRoom(socket.db!, roomId);

    if (!room) {
      console.error(`Room with ID ${roomId} does not exist`);
      return;
    }

    if (!room.sockets.has(socket)) {
      console.warn(`Socket ${socket.id} is not in room ${roomId}`);
      return;
    }

    console.log(`Message from socket ${socket.id} in room ${roomId}: ${message}`);

    const msgObj: Message = {
      roomId,
      senderId: socket.userId!,
      senderName: socket.name || 'Anonymous',
      content: message,
      timestamp: Date.now()
    }

    socket.emit("message", msgObj);
    socket.to(roomId).emit('message', msgObj);
    await addMessage(socket.db!, msgObj);
  })
}