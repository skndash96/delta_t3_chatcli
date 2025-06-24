import { compareSync, hashSync } from "bcrypt";
import { Router } from "express";
import { getToken } from "../utils/jwt.js";
import { User } from "../services/users.js";

const authRouter = Router()

authRouter.post("/register", async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    res.status(400).json({ error: 'Name and password are required' });
    return
  }

  const hashedPassword = hashSync(password, 10);

  try {
    const q = await req.db!.query<User>('INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *', [name, hashedPassword]);

    const user = q.rows[0];

    const token = await getToken({
      userId: user.id,
      name
    });

    res.status(201).json({ data: token });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return
  }
})

authRouter.post("/login", async (req, res) => {
  const { name, password } = req.body;

  try {
    const q = await req.db!.query<User>('SELECT * FROM users WHERE name = $1 LIMIT 1', [name])

    if (q.rows.length === 0) {
      res.status(401).json({ error: 'Invalid name or password' });
      return
    }

    const user = q.rows[0];

    if (!compareSync(password, user.password)) {
      res.status(401).json({ error: 'Invalid name or password' });
      return
    }

    const token = await getToken({
      userId: user.id,
      name
    });

    res.json({ data: token });
  } catch (error) {
    console.error('Database query error:', error);
    res.status(500).json({ error: 'Internal server error' });
    return
  }
})

export default authRouter;