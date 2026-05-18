/**
 * Print the Google OAuth URL for manual testing (optional session id).
 * Usage: node scripts/print-google-auth-url.mjs [sessionId]
 */
import '../scripts/load-env.mjs';
import { loadConfig } from '../lib/config.js';
import * as google from '../lib/google.js';

const cfg = loadConfig();
if (!cfg.configured('google')) {
  console.error('Google OAuth not configured. Copy .env.example to .env and set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  process.exit(1);
}

const session = process.argv[2] || 'test_session_' + Date.now();
const state = Buffer.from(
  JSON.stringify({
    session,
    returnUrl: cfg.frontendUrl + '/provider.html',
    provider: 'google',
  }),
).toString('base64url');

console.log('\nGoogle OAuth — open this URL in a browser:\n');
console.log(google.authUrl(cfg, state));
console.log('\nRedirect URI (must match Google Cloud console exactly):\n');
console.log(cfg.google.redirectUri);
console.log('\nAfter sign-in you will return to provider.html with calendar_connected=google\n');
