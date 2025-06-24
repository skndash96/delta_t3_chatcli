export interface Message {
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: number;
}

const messages = new Map<string, Message[]>();

export function addMessage(message: Message) {
  if (!messages.has(message.roomId)) {
    messages.set(message.roomId, []);
  }
  messages.get(message.roomId)!.push(message);
}

export function getMessages(roomId: string, fromN?: number, toN?: number): Message[] {
  if (!messages.has(roomId)) {
    return [];
  }

  const roomMessages = messages.get(roomId)!;

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