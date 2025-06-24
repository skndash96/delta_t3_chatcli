export interface Client {
  userId: number;
  socketId: string;
}

const clients = new Map<string, Client>()

export function addClient(userId: number, socketId: string) {
  clients.set(socketId, { userId, socketId });
}

export function removeClient(socketId: string) {
  clients.delete(socketId);
}

export function getClient(socketId: string): Client | undefined {
  return clients.get(socketId);
}