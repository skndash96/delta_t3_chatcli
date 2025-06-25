import readline from 'readline';

export function getAnswer(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    })

    rl.question(question, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}