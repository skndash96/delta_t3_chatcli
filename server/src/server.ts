import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import { connectDb } from './db/index';
import authRouter from './routes/auth';
import { handleConn } from './handleConn';
import { MySocket } from './types';

config();

startServer()
.catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
})

async function startServer() {
  const db = await connectDb()

  const app = express();
  const server = createServer(app);
  const io = new Server(server);

  app.use(express.json());

  app.use((req, _, next) => {
    req.db = db;
    next();
  })

  app.get('/', (_, res) => {
    res.send('Hello, World!');
  });

  app.use('/api/auth', authRouter);

  io.on('connection', (socket) => {
    const mySocket = socket as MySocket;
    mySocket.db = db;

    handleConn(mySocket)
  });

  const PORT = process.env.PORT || 3000;

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}