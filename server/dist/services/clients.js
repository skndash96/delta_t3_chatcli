const clients = new Map();
export function addClient(userId, socketId) {
    clients.set(socketId, { userId, socketId });
}
export function removeClient(socketId) {
    clients.delete(socketId);
}
export function getClient(socketId) {
    return clients.get(socketId);
}
