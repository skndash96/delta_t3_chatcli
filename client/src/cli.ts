import readline from "readline";
import { readStorageObject } from "./token";
import { io, Socket } from "socket.io-client";

readline.emitKeypressEvents(process.stdin);

process.stdin.setEncoding('utf8');
if (process.stdin.isTTY) process.stdin.setRawMode(true);

export default class CLI {
  token: string = ""
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
    } else {
      for (let i = this.lines.length; i < maxRows; i++) {
        this.lines.push('');
      }
    }

    console.clear();

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

  setLines(lines: string[]) {
    this.lines = lines;
    this.render();
  }

  setLine(line: string) {
    this.lines = [line];
    this.render();
  }

  setupConn() {
    this.setLines([])
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
        this.setLines([]);
        this.printHelp()
      }, 1000)
    })

    socket.on('error', (error) => {
      this.endWithLine(`Socket error: ${error.message}`);
      process.exit(1);
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
    this.setLines([])
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
        } else if (inp[0] === 'sr') {
          this.sendMessage(inp.slice(1).join(' '))
        } else {
          console.error(`Unknown command: ${this.inputBuffer}`);
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
Welcome to ChatCLI!
Command list:
- help: Show this help message
- exit: Exit the CLI
- ar: All previous rooms
- cr <id>: Create a room
- jr <id>: Join a room
- sr <msg>: Send a message to the current room
- lr: leave the current room
    `.split('\n').map(line => line.trim()).filter(Boolean);

    this.lines = help;
    this.render()
  }

  async allRooms() {
    try {
      const storageObject = await readStorageObject();
      if (!storageObject || !storageObject.rooms || storageObject.rooms.length === 0) {
        this.addLine('No rooms found. Create a room first.');
        return;
      }

      this.setLines(['Available rooms:']);
      storageObject.rooms.forEach(room => {
        this.addLine(`- ${room}`);
      });
    }  catch (error) {
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
      this.setLine(`Room created: ${data.roomName}`);
    } catch (error) {
      this.addLine(`Error creating room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  onMessageHandler(message: {
    senderId: number;
    senderName: string;
    content: string;
  }) {
    this.addLine(`${message.senderName}: ${message.content}`);
  }

  async joinRoom(roomName: string) {
    if (!roomName) {
      this.addLine('Room ID is required to join a room');
      return;
    }

    const socket = this.socket!;

    socket.emit('joinRoom', { roomName });

    socket.on('message', this.onMessageHandler);

    this.activeRoom = roomName;
  }

  async leaveRoom() {
    const socket = this.socket!;

    if (!this.activeRoom) {
      this.addLine('You are not in any room');
      return;
    }

    socket.emit('leaveRoom', { roomName: this.activeRoom });

    socket.off('message', this.onMessageHandler);
    this.activeRoom = null;

    this.addLine('Left the room');
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

    this.addLine(`You: ${message}`);
  }
}