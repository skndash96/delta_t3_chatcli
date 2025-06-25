import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

export default async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return
  }

  const payload = await verifyToken(token)

  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return
  }

  req.userId = payload.userId;

  next();
}