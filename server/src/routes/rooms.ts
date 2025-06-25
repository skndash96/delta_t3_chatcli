import { Router } from "express";
import { getRoom, Room } from "../services/rooms.js";
import { getLeaderboard } from "../services/messages.js";

const roomsRouter = Router()

roomsRouter.get("/", async (req, res) => {
  const db = req.db!;
  const userId = req.userId!;

  const q = await db.query<Room>(`SELECT * FROM rooms WHERE owner_id = $1`, [userId]);

  if (q.rowCount === 0) {
    res.status(404).json({ error: "No rooms found" });
    return
  }

  res.status(200).json({
    data: q.rows
  });
})

roomsRouter.get("/:roomId", async (req, res) => {
  const db = req.db!;
  const roomId = req.params.roomId;

  if (!roomId) {
    res.status(400).json({ error: "Room ID is required" });
    return
  }

  const room = await getRoom(db, roomId);
  const leaderboard = await getLeaderboard(db, roomId);

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return
  }

  res.status(200).json({
    data: {
      roomId: room.roomId,
      ownerId: room.ownerId,
      participants: Array.from(room.sockets).map(socket => ({
        userId: socket.userId!,
        name: socket.name!,
      })),
      leaderboard
    }
  });
})

roomsRouter.post("/", async (req, res) => {
  const userId = req.userId!;
  const db = req.db!;

  const roomId = req.body.roomId;

  if (!roomId) {
    res.status(400).json({ error: "Room name is required" });
    return
  }

  const q = await db.query<Room>(`INSERT INTO rooms (id, owner_id) VALUES ($1, $2) RETURNING *`, [roomId, userId])

  if (q.rowCount === 0) {
    res.status(500).json({ error: "Failed to create room" });
    return
  }

  res.status(201).json({
    data: q.rows[0]
  });
})

export default roomsRouter;