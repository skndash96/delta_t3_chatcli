import { Client } from "pg";
import { Socket } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      db?: Client
      userId?: number;
    }
  }
}

export interface MySocket extends Socket {
  db?: Client;
  userId?: number;
  name?: string;
}