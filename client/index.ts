import register from './src/register'
import login from './src/login'
import CLI from './src/cli'

async function main() {
  const cmd = process.argv[3] //pnpm run dev [cmd]

  if (cmd === 'register') {
    await register()
    return
  }
  
  if (cmd === 'login') {
    await login()
    return
  }

  new CLI()
}

main()