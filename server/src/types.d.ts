import { Client } from "pg";
import { Socket } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      db?: Client
    }
  }
}

export interface MySocket extends Socket {
  db?: MyDbType;
  userId?: number;
  userName?: string;
}