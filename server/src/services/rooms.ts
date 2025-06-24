import { MySocket } from "../types.js";

interface _Room {
  id: string;
  owner_id: number;
}

export type Room = {
  roomId: string;
  ownerId: number;
  socketIds: Set<string>;
}

const activeRooms = new Map<string, Room>();

export function addSocketToRoom(roomId: string, socketId: string, ownerId: number) {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, { roomId, socketIds: new Set(), ownerId });
  }

  activeRooms.get(roomId)!.socketIds.add(socketId);
}

export function removeSocketFromRoom(roomId: string, socketId: string) {
  const room = activeRooms.get(roomId);
  if (room) {
    room.socketIds.delete(socketId);
    if (room.socketIds.size === 0) {
      activeRooms.delete(roomId);
    }
  }
}

export async function getRoom(socket: MySocket, roomId: string) {
  const activeRoom = activeRooms.get(roomId);

  if (!activeRoom) {
    const db = socket.db!
    const room = await db.query<_Room>(`SELECT * FROM rooms WHERE id = $1`, [roomId]);

    if (room.rows.length === 0) {
      return null
    }

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        roomId: room.rows[0].id,
        ownerId: room.rows[0].owner_id,
        socketIds: new Set(),
      });
    }

    return activeRooms.get(roomId)!;
  }

  return activeRoom;
}