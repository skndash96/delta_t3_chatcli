const activeRooms = new Map();
export function addSocketToRoom(roomId, socketId, ownerId) {
    if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, { roomId, socketIds: new Set(), ownerId });
    }
    activeRooms.get(roomId).socketIds.add(socketId);
}
export function removeSocketFromRoom(roomId, socketId) {
    const room = activeRooms.get(roomId);
    if (room) {
        room.socketIds.delete(socketId);
        if (room.socketIds.size === 0) {
            activeRooms.delete(roomId);
        }
    }
}
export function getRoom(roomId) {
    return activeRooms.get(roomId);
}
