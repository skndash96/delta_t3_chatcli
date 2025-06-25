import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import { connectDb } from './db/index.js';
import authRouter from './routes/auth.js';
import { handleConn } from './handleConn.js';
import { MySocket } from './types.js';
import authMiddleware from './middlewares/auth.js';
import roomsRouter from './routes/rooms.js';
import { verifyToken } from './utils/jwt.js';

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
  app.use('/api/rooms', authMiddleware, roomsRouter)  

  app.get('/flag', (req, res) => {
    const payload = verifyToken(req.headers.authorization?.split(' ')[1] || '') as any;

    // Hint: Jwt secret is a 3 digit pin
    if (!payload || payload.isAdmin !== true) {
      res.status(401).json({ error: 'Unauthorized' });
      return
    }

    res.send("Congratulations! Here's your flag: chatcli{nice_job}");
  })

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