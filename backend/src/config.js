// src/config.js
import 'dotenv/config';

const cfg = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.API_PORT || 8080),
  jwtSecret: process.env.JWT_SECRET || 'change_me_super_secret',
  bcryptRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  db: {
    url:
      process.env.DATABASE_URL ||
      `postgres://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || 5432}/${process.env.POSTGRES_DB || 'opt_db'}`
  },
  cors: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  mail: {
    from: process.env.EMAIL_FROM,
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    weekendTo: process.env.WEEKEND_SUMMARY_TO
  },
  oidc: {
    issuer: process.env.OIDC_ISSUER,               // e.g. https://login.microsoftonline.com/<TENANT_ID>/v2.0
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,  // if confidential client
    redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:8080/api/v1/auth/sso/callback',
    roleClaim: process.env.OIDC_ROLE_CLAIM || 'roles',
    defaultRole: process.env.OIDC_DEFAULT_ROLE || 'VIEWER',
    frontendRedirect: process.env.FRONTEND_REDIRECT || 'http://localhost:5173'
  }
};

export default cfg;