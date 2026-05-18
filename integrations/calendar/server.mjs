/**
 * Calendar OAuth bridge — Google Calendar, Microsoft Outlook, Calendly.
 * Run: npm start  (from integrations/calendar)
 */
import http from 'http';
import { URL } from 'url';
import './scripts/load-env.mjs';
import { loadConfig, normalizeProvider } from './lib/config.js';
import { getSession, setSession, clearSession, requireSession } from './lib/store.js';
import * as google from './lib/google.js';
import * as microsoft from './lib/microsoft.js';
import * as calendly from './lib/calendly.js';

const HOST = process.env.CP_CALENDAR_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.CP_CALENDAR_BRIDGE_PORT || 3849);

const providers = { google, microsoft, calendly };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, obj) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function redirect(res, url) {
  cors(res);
  res.writeHead(302, { Location: url });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1e6) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function encodeState(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function decodeState(s) {
  try {
    return JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function providerUiKey(p) {
  if (p === 'microsoft') return 'outlook';
  return p;
}

async function fetchBusyForSession(cfg, session, days) {
  const mod = providers[session.provider];
  if (!mod) throw new Error('Unknown provider');
  return mod.fetchBusy(cfg, session, days);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) return sendJson(res, 400, { error: 'Bad request' });
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let u;
  try {
    u = new URL(req.url, `http://${HOST}:${PORT}`);
  } catch {
    return sendJson(res, 400, { error: 'Bad URL' });
  }

  const cfg = loadConfig();

  try {
    if (req.method === 'GET' && u.pathname === '/health') {
      return sendJson(res, 200, { ok: true, service: 'bookring-calendar-bridge' });
    }

    if (req.method === 'GET' && u.pathname === '/api/calendar/status') {
      return sendJson(res, 200, { ok: true, providers: cfg.status(), publicUrl: cfg.publicUrl });
    }

    if (req.method === 'GET' && u.pathname.startsWith('/api/calendar/auth/')) {
      const provider = normalizeProvider(u.pathname.split('/').pop());
      const session = u.searchParams.get('session');
      const returnUrl = u.searchParams.get('returnUrl') || cfg.frontendUrl + '/provider.html';
      if (!session) return sendJson(res, 400, { error: 'session query required' });
      if (!cfg.configured(provider)) {
        return sendJson(res, 400, {
          error: `${provider} OAuth not configured on server`,
          hint: 'Copy integrations/calendar/.env.example to .env and add client credentials',
        });
      }
      const state = encodeState({ session, returnUrl, provider });
      const mod = providers[provider];
      const url = mod.authUrl(cfg, state);
      return redirect(res, url);
    }

    if (req.method === 'GET' && u.pathname.startsWith('/api/calendar/callback/')) {
      const provider = normalizeProvider(u.pathname.split('/').pop());
      const code = u.searchParams.get('code');
      const err = u.searchParams.get('error');
      const stateRaw = u.searchParams.get('state');
      const state = decodeState(stateRaw || '');
      const returnBase = state?.returnUrl || cfg.frontendUrl + '/provider.html';

      if (err) {
        const back = new URL(returnBase);
        back.searchParams.set('calendar_error', err);
        return redirect(res, back.toString());
      }
      if (!code || !state?.session) {
        return sendJson(res, 400, { error: 'Missing code or state' });
      }

      const mod = providers[provider];
      const tokenData = await mod.exchangeCode(cfg, code);
      const profile = await mod.fetchProfile(tokenData.access_token);
      const sessionData = mod.sessionFromToken(tokenData, profile);
      setSession(state.session, sessionData);

      const back = new URL(returnBase);
      back.searchParams.set('calendar_connected', providerUiKey(provider));
      back.searchParams.set('calendar_email', sessionData.email || '');
      return redirect(res, back.toString());
    }

    if (req.method === 'GET' && u.pathname === '/api/calendar/connection') {
      const sessionId = u.searchParams.get('session');
      const s = getSession(sessionId);
      if (!s) {
        return sendJson(res, 200, { connected: false });
      }
      return sendJson(res, 200, {
        connected: true,
        provider: providerUiKey(s.provider),
        providerRaw: s.provider,
        email: s.email || '',
        displayName: s.displayName || '',
      });
    }

    if (req.method === 'POST' && u.pathname === '/api/calendar/disconnect') {
      let body = {};
      const raw = await readBody(req);
      if (raw) body = JSON.parse(raw);
      const sessionId = body.session || u.searchParams.get('session');
      clearSession(sessionId);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && u.pathname === '/api/calendar/busy') {
      const sessionId = u.searchParams.get('session');
      const days = Number(u.searchParams.get('days') || 21);
      const s = requireSession(sessionId);
      const slots = await fetchBusyForSession(cfg, s, days);
      setSession(sessionId, s);
      return sendJson(res, 200, {
        ok: true,
        provider: providerUiKey(s.provider),
        email: s.email,
        slots,
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    const code = e.code === 'NOT_CONNECTED' ? 401 : 500;
    return sendJson(res, code, { error: e.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const st = loadConfig().status();
  console.log(`BookRing calendar bridge  http://${HOST}:${PORT}`);
  console.log('Providers configured:', Object.entries(st).filter(([, v]) => v.configured).map(([k]) => k).join(', ') || '(none — add .env)');
  console.log('OAuth callbacks: /api/calendar/callback/{google|microsoft|calendly}');
});
