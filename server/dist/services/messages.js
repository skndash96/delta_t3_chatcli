const messages = new Map();
export function addMessage(message) {
    if (!messages.has(message.roomId)) {
        messages.set(message.roomId, []);
    }
    messages.get(message.roomId).push(message);
}
export function getMessages(roomId, fromN, toN) {
    if (!messages.has(roomId)) {
        return [];
    }
    const roomMessages = messages.get(roomId);
    if (fromN !== undefined && toN !== undefined) {
        return roomMessages.slice(fromN, toN);
    }
    if (fromN !== undefined) {
        return roomMessages.slice(fromN);
    }
    if (toN !== undefined) {
        return roomMessages.slice(0, toN);
    }
    return roomMessages;
}
