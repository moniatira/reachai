/**
 * OAuth token store (file-backed for local dev; use Redis/DB in production).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function loadAll() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let cache = loadAll();

export function getSession(sessionId) {
  if (!sessionId) return null;
  return cache[sessionId] || null;
}

export function setSession(sessionId, data) {
  cache[sessionId] = { ...data, updatedAt: new Date().toISOString() };
  saveAll(cache);
}

export function clearSession(sessionId) {
  delete cache[sessionId];
  saveAll(cache);
}

export function requireSession(sessionId) {
  const s = getSession(sessionId);
  if (!s || !s.accessToken) {
    const err = new Error('Not connected. Sign in with Google Calendar first.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }
  return s;
}
