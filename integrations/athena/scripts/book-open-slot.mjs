#!/usr/bin/env node
/**
 * Book an open appointment slot for ATHENA_PATIENT_ID.
 * Usage: npm run book-slot -- <appointmentId>
 */
import './load-env.mjs';
import { loadConfig } from '../lib/config.js';
import { bookAppointment } from '../lib/appointments.js';

const cfg = loadConfig();
if (cfg.missing.length) {
  console.error('Missing env:', cfg.missing.join(', '));
  process.exit(1);
}
const patientId = (cfg.patientId || '').trim();
if (!patientId) {
  console.error('Set ATHENA_PATIENT_ID in .env');
  process.exit(1);
}

const appointmentId = process.argv[2] || process.env.ATHENA_APPOINTMENT_ID;
if (!appointmentId) {
  console.error('Usage: npm run book-slot -- <appointmentId>');
  console.error('Run npm run open first and pick an appointment id from the response.');
  process.exit(1);
}

try {
  const result = await bookAppointment(cfg, appointmentId, patientId);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
