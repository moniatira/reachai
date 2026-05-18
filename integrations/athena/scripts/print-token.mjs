#!/usr/bin/env node
import './load-env.mjs';
import { loadConfig } from '../lib/config.js';
import { getAccessToken } from '../lib/oauth.js';

const cfg = loadConfig({ requirePractice: false });
if (cfg.missing.length) {
  console.error('Missing env:', cfg.missing.join(', '));
  process.exit(1);
}

try {
  const token = await getAccessToken(cfg);
  console.log(token);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
