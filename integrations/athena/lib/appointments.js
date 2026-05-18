/**
 * Classic Athenahealth Appointments API (REST v1).
 * Paths match public Ruby client / official reference patterns:
 *   GET  /{practiceId}/appointments/booked
 *   GET  /{practiceId}/appointments/open
 *   GET  /{practiceId}/appointments/{appointmentId}
 *   PUT  /{practiceId}/appointments/{appointmentId}  (book slot → patient)
 *
 * Parameter names (departmentid, startdate, …) are lowercase as in Athena docs.
 *
 * @see https://docs.athenahealth.com/api/sandbox#/Appointments
 */

import { getAccessToken } from './oauth.js';
import { athenaGet, athenaPut } from './http.js';

function q(params) {
  const u = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v != null && v !== '') u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : '';
}

export async function listBookedAppointments(cfg, { departmentId, startDate, endDate, extraParams }) {
  const token = await getAccessToken(cfg);
  const pid = cfg.practiceId;
  const params = {
    departmentid: departmentId ?? cfg.departmentId,
    startdate: startDate,
    enddate: endDate,
    ...(extraParams || {}),
  };
  const path = `/${pid}/appointments/booked${q(params)}`;
  return athenaGet(cfg, token, path);
}

/** booked across multiple departments (comma-separated department ids in Athena). */
export async function listBookedAppointmentsMultiDept(cfg, { departmentId, startDate, endDate, extraParams }) {
  const token = await getAccessToken(cfg);
  const pid = cfg.practiceId;
  const params = {
    departmentid: departmentId ?? cfg.departmentId,
    startdate: startDate,
    enddate: endDate,
    ...(extraParams || {}),
  };
  const path = `/${pid}/appointments/booked/multipledepartment${q(params)}`;
  return athenaGet(cfg, token, path);
}

export async function listOpenAppointmentSlots(cfg, { departmentId, extraParams }) {
  const token = await getAccessToken(cfg);
  const pid = cfg.practiceId;
  const params = {
    departmentid: departmentId ?? cfg.departmentId,
    ...(extraParams || {}),
  };
  const path = `/${pid}/appointments/open${q(params)}`;
  return athenaGet(cfg, token, path);
}

export async function getAppointment(cfg, appointmentId, extraParams) {
  const token = await getAccessToken(cfg);
  const pid = cfg.practiceId;
  const path = `/${pid}/appointments/${encodeURIComponent(appointmentId)}${q(extraParams || {})}`;
  return athenaGet(cfg, token, path);
}

/** Reserve an open slot for a patient (PUT with patientid). */
export async function bookAppointment(cfg, appointmentId, patientId, extraBody) {
  const token = await getAccessToken(cfg);
  const pid = cfg.practiceId;
  const path = `/${pid}/appointments/${encodeURIComponent(appointmentId)}`;
  return athenaPut(cfg, token, path, { patientid: patientId, ...(extraBody || {}) });
}
