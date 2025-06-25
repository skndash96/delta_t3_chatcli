import { MySocket } from "../types.js";
import { removeSocketFromRoom } from "./rooms.js";

export interface Client {
  userId: number;
  socketId: string;
  activeRoom: string | null; // 1 socket can be in one room at a time
  createdAt: number;
}

const clients = new Map<string, Client>()

export function addClient(socket: MySocket) {
  clients.set(socket.id, { userId: socket.userId!, socketId: socket.id, activeRoom: null, createdAt: Date.now() });
}

export function setActiveRoomForClient(socket: MySocket, roomId: string|null) {
  const client = clients.get(socket.id);
  if (client) {
    client.activeRoom = roomId;
  } else {
    console.warn(`Client ${socket.id} not found when setting active room`);
  }
}

export async function removeClient(socket: MySocket) {
  const client = clients.get(socket.id);

  if (client) {
    if (client.activeRoom) {
      await removeSocketFromRoom(socket, client.activeRoom);
    }

    clients.delete(socket.id);
  }
}

export function getClient(socket: MySocket): Client | undefined {
  return clients.get(socket.id);
}