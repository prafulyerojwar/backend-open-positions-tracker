// src/middleware/error.js
export function errorHandler(err, req, res, _next) {
  console.error('[ERROR]', err?.message || err, err?.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
}