// src/routes/auth.js
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cfg from '../config.js';
import { findUserByEmail } from '../models/userModel.js';

const router = Router();

function isBcryptHash(s) {
  return typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email & password required' });
  }

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const stored = user.password_hash ?? '';
  let ok = false;

  if (isBcryptHash(stored)) ok = await bcrypt.compare(password, stored);
  else ok = password === stored;

  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    cfg.jwtSecret,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

export default router;