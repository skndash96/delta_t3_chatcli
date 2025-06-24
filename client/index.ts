import readline from 'readline';

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

const cyan = (msg: string) => `\x1b[36m${msg}\x1b[0m`;
const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const bold = (msg: string) => `\x1b[1m${msg}\x1b[0m`;

export class CLI {
  username: string | null = null;
  authToken: string | null = null;
  activeRoomId: string | null = null;
  lines: string[] = [];
  inputBuffer: string = '';
  inputPrompt: string = '> ';
  currentQuestion: string | null = null;
  inputResolve?: (val: string) => void;

  constructor() {
    process.stdin.on('data', this.handleInput.bind(this));
    this.printBanner();
    this.auth();
  }

  printBanner() {
    const banner = bold(cyan("Welcome to ChatCLI"));
    const subtitle = green("Login to continue...");
    const center = (text: string) =>
      text.padStart((process.stdout.columns + text.length) / 2);
    this.lines.push('', center(banner), center(subtitle), '');
    this.render();
  }

  handleInput(chunk: Buffer) {
    const char = chunk.toString();
    if (char === '\r' || char === '\n') {
      const input = this.inputBuffer;
      this.inputBuffer = '';
      if (this.currentQuestion && this.inputResolve) {
        this.lines.push(`${cyan(this.currentQuestion)} ${input}`);
        const resolve = this.inputResolve;
        this.inputResolve = undefined;
        this.currentQuestion = null;
        resolve(input);
      }
    } else if (char === '\u0003') {
      process.exit();
    } else if (char === '\u007f') {
      this.inputBuffer = this.inputBuffer.slice(0, -1);
    } else {
      this.inputBuffer += char;
    }
    this.render();
  }

  async auth() {
    const username = await this.getLine("username:");
    if (!username) return this.exitWithError("Username cannot be empty.");
    this.render();

    const password = await this.getLine("password:");
    if (!password) return this.exitWithError("Password cannot be empty.");

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.status !== 200) {
        this.exitWithError(data.error || "Authentication failed.");
        return;
      }

      this.username = username;
      this.authToken = data.token;
      this.lines.push(green(`✅ Logged in as ${username}`));
      this.render();
    } catch (e) {
      this.exitWithError(new String(e).toString());
    }
  }

  getLine(prompt: string) {
    this.currentQuestion = prompt;
    this.inputBuffer = '';
    this.render();
    return new Promise<string>((resolve) => {
      this.inputResolve = resolve;
    });
  }

  render() {
    const maxRows = process.stdout.rows - 1;
    const maxCols = process.stdout.columns;

    const output = [...this.lines];
    const prompt = this.currentQuestion
      ? cyan(this.currentQuestion + ' ') + this.inputBuffer
      : cyan(this.inputPrompt) + this.inputBuffer;
    output.push(prompt);

    const visible = output.slice(-maxRows)
      .map(line => line.slice(0, maxCols))
      .join('\n');

    process.stdout.write('\x1b[2J\x1b[H' + visible);
  }

  clearLines() {
    this.lines = [];
    this.render();
  }

  exitWithError(msg: string) {
    this.clearLines();
    process.stdout.write('\n' + red(`Error: ${msg}`) + '\n');
    process.exit(1);
  }
}

new CLI();
