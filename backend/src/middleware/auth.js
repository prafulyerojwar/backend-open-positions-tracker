// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import cfg from '../config.js';

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    const payload = jwt.verify(token, cfg.jwtSecret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(...roles) {
  const ROLES = roles.map(r => String(r).toUpperCase());
  return (req, res, next) => {
    const curr = String(req.user?.role || '').toUpperCase();
    if (!curr || !ROLES.includes(curr)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}