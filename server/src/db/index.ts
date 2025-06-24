import { Client } from 'pg'

export async function connectDb() {
  const client = new Client(process.env.DATABASE_URL)

  await client.connect()

  return client
}