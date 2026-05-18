import '../scripts/load-env.mjs';
import { loadConfig } from '../lib/config.js';

const cfg = loadConfig();
const st = cfg.status();
console.log('Calendar bridge env check\n');
for (const [name, info] of Object.entries(st)) {
  const ok = info.configured ? 'OK' : 'MISSING';
  console.log(`  ${name}: ${ok}`, info.missing.length ? `(${info.missing.join(', ')})` : '');
}
console.log('\nPublic URL:', cfg.publicUrl);
console.log('Frontend URL:', cfg.frontendUrl);
