import { Client } from "pg";

export interface Message {
  roomId: string;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: number;
}

const messages = new Map<string, Message[]>();

export async function addMessage(db: Client, message: Message) {
  if (!messages.has(message.roomId)) {
    messages.set(message.roomId, []);
  }

  messages.get(message.roomId)!.push(message);

  try {
    await db.query(`INSERT INTO messages (room_id, sender_id, sender_name, content) VALUES ($1, $2, $3, $4)`, [
      message.roomId,
      message.senderId,
      message.senderName,
      message.content,
    ]);

    await db.query(`
      INSERT INTO leaderboard (room_id, user_id, user_name) VALUES ($1, $2, $3)
      ON CONFLICT (room_id, user_id) DO UPDATE SET score = leaderboard.score + 1
    `, [
      message.roomId,
      message.senderId,
      message.senderName
    ]);
  } catch (error) {
    console.error(`Error adding message to room ${message.roomId}:`, error);
  }
}

export async function getMessages(db: Client, roomId: string, fromN?: number, toN?: number) {
  if (!messages.has(roomId)) {
    const q = await db.query(`SELECT * FROM messages WHERE room_id = $1 ORDER BY timestamp ASC `, [roomId]);

    const rows = q.rows;

    messages.set(roomId, rows.map(row => ({
      roomId: row.room_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      content: row.content,
      timestamp: new Date(row.timestamp).getTime(),
    })))
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

export const getLeaderboard = async (db: Client, roomId: string) => {
  const q = await db.query(`
    SELECT *
    FROM leaderboard
    WHERE room_id = $1
    ORDER BY score DESC
  `, [roomId]);

  return q.rows.map(row => ({
    userId: row.user_id,
    name: row.user_name,
    score: parseInt(row.score, 10),
    activeMins: parseInt(row.active_mins, 10),
  }));
}