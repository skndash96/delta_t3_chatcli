import { Client } from "pg";
import { MySocket } from "../types.js";

interface _Room {
  id: string;
  owner_id: number;
}

export type Room = {
  roomId: string;
  ownerId: number;
  sockets: Set<MySocket>;
}

const activeRooms = new Map<string, Room>();

export function addSocketToRoom(socket: MySocket, roomId: string) {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, { roomId, sockets: new Set(), ownerId: socket.userId! });
  }

  activeRooms.get(roomId)!.sockets.add(socket);
}

export function removeSocketFromRoom(socket: MySocket, roomId: string) {
  const room = activeRooms.get(roomId);
  if (room) {
    room.sockets.delete(socket);
    if (room.sockets.size === 0) {
      activeRooms.delete(roomId);
    }
  }
}

export async function getRoom(db: Client, roomId: string) {
  const activeRoom = activeRooms.get(roomId);

  if (!activeRoom) {
    const room = await db.query<_Room>(`SELECT * FROM rooms WHERE id = $1`, [roomId]);

    if (room.rows.length === 0) {
      return null
    }

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        roomId: room.rows[0].id,
        ownerId: room.rows[0].owner_id,
        sockets: new Set(),
      });
    }

    return activeRooms.get(roomId)!;
  }

  return activeRoom;
}