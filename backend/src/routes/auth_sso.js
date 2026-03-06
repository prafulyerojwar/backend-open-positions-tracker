// src/routes/auth_sso.js
import { Router } from 'express';
import { Issuer, generators } from 'openid-client';
import jwt from 'jsonwebtoken';
import cfg from '../config.js';

const router = Router();
let _client;

async function getClient() {
  if (_client) return _client;
  const issuer = await Issuer.discover(cfg.oidc.issuer);
  _client = new issuer.Client({
    client_id: cfg.oidc.clientId,
    client_secret: cfg.oidc.clientSecret,
    redirect_uris: [cfg.oidc.redirectUri],
    response_types: ['code']
  });
  return _client;
}

const stateStore = new Map();

router.get('/sso/start', async (_req, res, next) => {
  try {
    const client = await getClient();
    const state = generators.state();
    const verifier = generators.codeVerifier();
    const challenge = generators.codeChallenge(verifier);
    stateStore.set(state, { verifier, ts: Date.now() });

    const authorizationUrl = client.authorizationUrl({
      scope: 'openid profile email',
      response_mode: 'query',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    res.json({ authorization_url: authorizationUrl, state });
  } catch (e) { next(e); }
});

router.get('/sso/callback', async (req, res, next) => {
  try {
    const client = await getClient();
    const { state } = req.query;
    const saved = stateStore.get(state);
    if (!saved) return res.status(400).json({ message: 'bad state' });

    const params = client.callbackParams(req);
    const tokenSet = await client.callback(cfg.oidc.redirectUri, params, {
      state, code_verifier: saved.verifier
    });

    const id = tokenSet.claims();
    const rawRoles = id[cfg.oidc.roleClaim] || [];
    const role = Array.isArray(rawRoles) && rawRoles.length
      ? String(rawRoles[0]).toUpperCase()
      : cfg.oidc.defaultRole;

    const appToken = jwt.sign(
      { sub: id.sub, email: id.email || id.preferred_username, role, name: id.name || '' },
      cfg.jwtSecret,
      { expiresIn: '8h' }
    );

    res.json({
      token: appToken,
      user: { id: id.sub, email: id.email || id.preferred_username, name: id.name || '', role }
    });

    // Or redirect frontend with token if you prefer:
    // return res.redirect(`${cfg.oidc.frontendRedirect}?token=${encodeURIComponent(appToken)}`);
  } catch (e) { next(e); }
});

export default router;