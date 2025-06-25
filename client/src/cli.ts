import readline from "readline";
import { readStorageObject } from "./token";
import { io, Socket } from "socket.io-client";
import { decodeJwt } from "jose";

readline.emitKeypressEvents(process.stdin);

process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);

export default class CLI {
  token: string = ""
  tokenPayload: { userId: number, name: string } | null = null;
  lines: string[] = []
  socket: Socket | null = null
  inputBuffer: string = ""
  activeRoom: string | null = null;

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })

  constructor() {
    readStorageObject()
      .then(storage => {
        if (storage) {
          this.token = storage.token;

          const payload = decodeJwt(storage.token) as typeof this.tokenPayload;
          this.tokenPayload = payload!

          this.setupConn();
          this.setupListeners();
        } else {
          this.endWithLine('No token found. Please register or login first.', 1);
          process.exit(0);
        }
      })
  }

  render(promptAtEnd: boolean = true) {
    const maxRows = process.stdout.rows - 2;
    const maxCols = process.stdout.columns;

    if (this.lines.length > maxRows) {
      this.lines = this.lines.slice(-maxRows);
    }

    if (promptAtEnd) {
      for (let i = this.lines.length; i < maxRows; i++) {
        this.lines.push('');
      }
      console.clear();
    }

    console.log(
      this.lines.slice(-maxRows).map(line => {
        const truncatedLine = line.length > maxCols ? line.slice(0, maxCols - 3) + '...' : line;
        return truncatedLine
      }).join('\n')
    );

    if (promptAtEnd) {
      this.rl.prompt();
    }
  }

  endWithLine(line: string, status: number = 0) {
    this.lines.push(line)
    this.render(false)
    process.exit(status)
  }

  addLine(line: string) {
    this.lines.push(line);
    this.render();
  }

  addLines(lines: string[]) {
    this.lines.push("")
    this.lines = this.lines.concat(lines);
    this.render();
  }

  setupConn() {
    this.addLine('Connecting to server...');

    const socket = io('http://localhost:3000', {
      timeout: 10000,
      extraHeaders: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    socket.on('connect', () => {
      this.addLine('Connected to server');

      this.socket = socket;

      setTimeout(() => {
        this.printHelp()
      }, 200)
    })

    socket.on('error', (error) => {
      this.addLine(`Error: ${error.message}`);
    })

    socket.on('connect_error', (err) => {
      this.endWithLine(`Connection error: ${err.message}`);
      process.exit(1);
    });

    socket.on('disconnect', () => {
      this.endWithLine('Disconnected from server. Please login again.');
      process.exit(0);
    });
  }

  setupListeners() {
    process.stdin.on('keypress', async (str, key) => {
      if (key.name === 'return') {
        const inp = this.inputBuffer.trim().split(/\s+/);

        if (inp[0] === 'exit') {
          this.endWithLine('Exiting CLI...')
          process.exit(0)
        } else if (inp[0] === 'help') {
          this.printHelp()
        } else if (inp[0] === 'ar') {
          this.allRooms()
        } else if (inp[0] === 'cr') {
          this.createRoom(inp[1])
        } else if (inp[0] === 'jr') {
          this.joinRoom(inp[1])
        } else if (inp[0] === 'lr') {
          this.leaveRoom()
        } else if (inp[0] === 'ir') {
          this.infoRoom()
        } else if (inp[0] === 'sr') {
          this.sendMessage(inp.slice(1).join(' '))
        } else {
          this.addLine(`Unknown command: ${inp[0]}`);
        }

        this.rl.prompt();
        this.inputBuffer = '';
      } else if (key.name === 'backspace' || key.name === 'delete') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
      } else if (key.name === 'c' && key.ctrl) {
        this.endWithLine('Exiting CLI...');
        process.exit(0);
      } else {
        this.inputBuffer += str;
      }
    })
  }

  printHelp() {
    const help = `
welcome to chatCLI!
command list:
- help: show this help message
- exit: exit the CLI
- ar: your created rooms
- cr <id>: create a room
- jr <id>: join a room
- sr <msg>: send a message to the current room
- ir: info about the current room
- lr: leave the current room
    `.split('\n').map(line => line.trim()).filter(Boolean);

    this.lines = help;
    this.render()
  }

  async allRooms() {
    try {
      const response = await fetch('http://localhost:3000/api/rooms', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      })

      if (!response.ok) {
        const { error } = await response.json();
        this.addLine(`Error fetching rooms: ${error}`);
        return;
      }

      const { data } = await response.json();

      if (data.length === 0) {
        this.addLine('No rooms found');
        return;
      }

      this.addLines([
        `Rooms (${data.length}):`,
        ...data.map((room: { id: string; ownerId: number }) => `${room.id}`)
      ]);
    } catch (error) {
      this.addLine(`Error fetching rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createRoom(roomName: string) {
    if (!roomName) {
      this.addLine('Room ID is required to create a room');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ roomId: roomName })
      });
      const { data, error } = await response.json();
      if (!response.ok) {
        this.addLine(`Error: ${JSON.stringify(error)}`);
        return;
      }
      this.addLine(`Room created: ${data}`);
    } catch (error) {
      this.addLine(`Error creating room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  onMessageHandler(message: {
    senderId: number;
    senderName: string;
    content: string;
  }) {
    this.addLine(`${message.senderId === this.tokenPayload!.userId ? "You" : message.senderName}: ${message.content}`);
  }

  async joinRoom(roomName: string) {
    if (this.activeRoom) {
      this.addLine(`You are already in room: ${this.activeRoom}`);
      return;
    }

    if (!roomName) {
      this.addLine('Room ID is required to join a room');
      return;
    }

    const socket = this.socket!;

    socket.emit('joinRoom', roomName);

    socket.on('message', this.onMessageHandler.bind(this));

    this.activeRoom = roomName;

    this.addLine(`Joined room: ${roomName}`);
  }

  leaveRoom() {
    const socket = this.socket!;

    if (!this.activeRoom) {
      this.addLine('You are not in any room');
      return;
    }

    socket.emit('leaveRoom', this.activeRoom);

    socket.off('message', this.onMessageHandler);
    this.activeRoom = null;

    this.addLine(`Left room: ${this.activeRoom}`);
  }

  async sendMessage(message: string) {
    const socket = this.socket!;

    if (!this.activeRoom) {
      this.addLine('You are not in any room');
      return;
    }

    if (!message.trim()) {
      this.addLine('Message cannot be empty');
      return;
    }

    socket.emit('message', this.activeRoom, message);
  }

  async infoRoom() {
    if (!this.activeRoom) {
      this.addLine('You are not in any room');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/rooms/${this.activeRoom}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        const { error } = await response.json();
        this.addLine(`Error fetching room info: ${error}`);
        return;
      }

      const { data } = await response.json();


      const users = new Map<string, { active: boolean, name: string, score: number }>()

      data.participants.forEach((p: { userId: number, name: string }) => {
        users.set(p.userId.toString(), { active: true, name: p.name, score: 0 });
      });

      data.leaderboard.forEach((p: { userId: number, name: string, score: number }) => {
        if (users.has(p.userId.toString())) {
          users.get(p.userId.toString())!.score = p.score;
        } else {
          users.set(p.userId.toString(), { active: false, name: p.name, score: p.score });
        }
      })

      this.addLines([
        `room ID: ${data.roomId}`,
        `owner ID: ${data.ownerId}`,
        `participants ${data.participants.length}:`,
        ...Array.from(users.values()).map(v => `${v.name} (${v.active ? "*" : "-"}) ${v.score}`),
      ]);
    } catch (error) {
      this.addLine(`Error fetching room info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}