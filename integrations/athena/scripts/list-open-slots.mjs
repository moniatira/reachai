#!/usr/bin/env node
import './load-env.mjs';
import { loadConfig } from '../lib/config.js';
import { listOpenAppointmentSlots } from '../lib/appointments.js';

const cfg = loadConfig();
if (cfg.missing.length) {
  console.error('Missing env:', cfg.missing.join(', '));
  process.exit(1);
}

if (!cfg.departmentId) {
  console.error('Set ATHENA_DEPARTMENT_ID for open-slot queries.');
  process.exit(1);
}

try {
  const data = await listOpenAppointmentSlots(cfg, {});
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
