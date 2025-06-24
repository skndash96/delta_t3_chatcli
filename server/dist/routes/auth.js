import { hashSync } from "bcrypt";
import { Router } from "express";
import { getToken } from "../utils/jwt.js";
const router = Router();
router.post("/register", async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        res.status(400).json({ error: 'Name and password are required' });
        return;
    }
    const hashedPassword = hashSync(password, 10);
    try {
        const q = await req.db.query('INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *', [name, hashedPassword]);
        const user = q.rows[0];
        const token = await getToken({
            userId: user.id,
        });
        res.status(201).json({ token });
    }
    catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
router.post("/login", async (req, res) => {
    const { name, password } = req.body;
    const hashedPassword = hashSync(password, 10);
    try {
        const q = await req.db.query('SELECT * FROM users WHERE name = $1 AND password = $2 LIMIT 1', [name, hashedPassword]);
        if (q.rows.length === 0) {
            res.status(401).json({ error: 'Invalid name or password' });
            return;
        }
        const user = q.rows[0];
        const token = await getToken({
            userId: user.id,
        });
        res.json({ token });
    }
    catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
    }
});
export default router;
