import { Router } from "express";
import { Room } from "../services/rooms.js";

const roomsRouter = Router()

roomsRouter.post("/", async (req, res) => {
  const userId = req.userId!;
  const db = req.db!;

  const roomName = req.body.roomName;

  if (!roomName) {
    res.status(400).json({ error: "Room name is required" });
    return
  }

  const q = await db.query<Room>(`INSERT INTO rooms (name, owner_id) VALUES ($1, $2) RETURNING *`, [roomName, userId])

  if (q.rowCount === 0) {
    res.status(500).json({ error: "Failed to create room" });
    return
  }

  res.status(201).json({
    data: q.rows[0]
  });
})

export default roomsRouter;