import { MySocket } from "../types.js";
import { removeSocketFromRoom } from "./rooms.js";

export interface Client {
  userId: number;
  socketId: string;
  activeRoom: string | null; // 1 socket can be in one room at a time
}

const clients = new Map<string, Client>()

export function addClient(socket: MySocket) {
  clients.set(socket.id, { userId: socket.userId!, socketId: socket.id, activeRoom: null });
}

export function removeClient(socket: MySocket) {
  const client = clients.get(socket.id);
  if (client) {
    if (client.activeRoom) {
      removeSocketFromRoom(socket, client.activeRoom);
    }

    clients.delete(socket.id);
  }
}

export function getClient(socket: MySocket): Client | undefined {
  return clients.get(socket.id);
}