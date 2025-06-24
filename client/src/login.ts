import { getAnswer } from "./question"
import { saveToken } from "./token"

export default async function login() {
  const name = await getAnswer('Enter name: ')
  const password = await getAnswer('Enter password: ')

  if (!name || !password) {
    console.error('Name and password are required')
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Error:', error)
      return
    }

    const { data, error } = await response.json()
    console.log('Login successful')

    saveToken(data)
    console.log('Token saved to ./.token');
  } catch (error) {
    console.error('Error:', error)
  }
}