#!/usr/bin/env node
import './load-env.mjs';
import { loadConfig } from '../lib/config.js';
import { listBookedAppointments } from '../lib/appointments.js';

const cfg = loadConfig();
if (cfg.missing.length) {
  console.error('Missing env:', cfg.missing.join(', '));
  process.exit(1);
}

if (!cfg.departmentId) {
  console.error('Set ATHENA_DEPARTMENT_ID for booked-appointment queries.');
  process.exit(1);
}

const startDate = process.argv[2] || process.env.ATHENA_START_DATE;
const endDate = process.argv[3] || process.env.ATHENA_END_DATE;
if (!startDate || !endDate) {
  console.error('Usage: npm run booked -- MM/DD/YYYY MM/DD/YYYY');
  console.error('Or set ATHENA_START_DATE and ATHENA_END_DATE (Athena date format).');
  process.exit(1);
}

try {
  const extra = {};
  const pid = (cfg.patientId || '').trim();
  if (pid) extra.patientid = pid;

  const data = await listBookedAppointments(cfg, {
    departmentId: cfg.departmentId,
    startDate,
    endDate,
    extraParams: Object.keys(extra).length ? extra : undefined,
  });
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
