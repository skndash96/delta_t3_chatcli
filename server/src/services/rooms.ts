import { Client } from "pg";
import { MySocket } from "../types.js";
import { getClient } from "./clients.js";

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

export async function removeSocketFromRoom(socket: MySocket, roomId: string) {
  const client = getClient(socket);

  if (client) {
    const activeMins = Math.floor((Date.now() - client.createdAt) / 60000);

    if (activeMins > 0) {
      await socket.db!.query(
        `INSERT INTO leaderboard (room_id, user_id, user_name, active_mins)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (room_id, user_id) DO UPDATE SET active_mins = leaderboard.active_mins + $4`,
        [
          roomId,
          socket.userId!,
          socket.name!,
          activeMins,
        ]
      ).catch(err => {
        console.error(`Error updating leaderboard for user ${socket.userId} in room ${roomId}:`, err);
      });

      console.log(`Updated leaderboard for user ${socket.userId} in room ${roomId} with ${activeMins} active minutes`);
    } else {
      console.log(`No active minutes to update for user ${socket.userId} in room ${roomId}`);
    }
  }

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