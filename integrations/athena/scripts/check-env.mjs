#!/usr/bin/env node
import './load-env.mjs';
import { loadConfig } from '../lib/config.js';

function label(key, set, sensitive) {
  if (!set) console.log(`  ✗ ${key}: (missing)`);
  else if (sensitive) console.log(`  ✓ ${key}: set`);
  else console.log(`  ✓ ${key}: ${process.env[key] || ''}`);
}

console.log('Athena env check:\n');
label('ATHENA_TOKEN_URL', !!(process.env.ATHENA_TOKEN_URL && process.env.ATHENA_TOKEN_URL.trim()), false);
label('ATHENA_API_BASE', !!(process.env.ATHENA_API_BASE && process.env.ATHENA_API_BASE.trim()), false);
label('ATHENA_CLIENT_ID', !!(process.env.ATHENA_CLIENT_ID && process.env.ATHENA_CLIENT_ID.trim()), true);
label('ATHENA_CLIENT_SECRET', !!(process.env.ATHENA_CLIENT_SECRET && process.env.ATHENA_CLIENT_SECRET.trim()), true);
const sc = process.env.ATHENA_SCOPE && process.env.ATHENA_SCOPE.trim();
console.log(sc ? `  ✓ ATHENA_SCOPE: ${sc}` : '  ⚠ ATHENA_SCOPE: (empty — Preview often requires a scope; see README)');
const pid = process.env.ATHENA_PRACTICE_ID && process.env.ATHENA_PRACTICE_ID.trim();
console.log(pid ? `  ✓ ATHENA_PRACTICE_ID: ${pid}` : '  · ATHENA_PRACTICE_ID: (add for appointment API paths)');
const dep = process.env.ATHENA_DEPARTMENT_ID && process.env.ATHENA_DEPARTMENT_ID.trim();
console.log(dep ? `  ✓ ATHENA_DEPARTMENT_ID: ${dep}` : '  · ATHENA_DEPARTMENT_ID: (required for open/booked — not the patient ID)');
const pat = process.env.ATHENA_PATIENT_ID && process.env.ATHENA_PATIENT_ID.trim();
console.log(pat ? `  ✓ ATHENA_PATIENT_ID: ${pat}` : '  · ATHENA_PATIENT_ID: (set when testing bookAppointment)');

console.log('');
const oauthOnly = loadConfig({ requirePractice: false });
if (oauthOnly.missing.length) {
  console.log('Missing (OAuth):', oauthOnly.missing.join(', '));
  console.log('Fix integrations/athena/.env');
  process.exit(1);
}

if (!pid) {
  console.log('Note: Practice ID still unset — `npm run token` works; `npm run booked` / APIs under /{practiceId}/... need ATHENA_PRACTICE_ID.');
}

console.log('');
console.log('OAuth variables OK.');
process.exit(0);
