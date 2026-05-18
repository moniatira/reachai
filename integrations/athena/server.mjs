/**
 * Local bridge: exposes read-only Athena appointment helpers + book for the BookRing dashboard.
 * Secrets stay in .env (never in the browser). Run: npm run portal
 *
 * Binds to 127.0.0.1 by default.
 */
import http from 'http';
import { URL } from 'url';
import './scripts/load-env.mjs';
import { loadConfig } from './lib/config.js';
import {
  listOpenAppointmentSlots,
  listBookedAppointments,
  bookAppointment,
} from './lib/appointments.js';

const HOST = process.env.CP_ATHENA_BRIDGE_HOST || '127.0.0.1';
const PORT = Number(process.env.CP_ATHENA_BRIDGE_PORT || 3847);

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

function queryExtras(searchParams, skip) {
  const o = {};
  const skipSet = new Set(skip);
  searchParams.forEach((v, k) => {
    if (!skipSet.has(k)) o[k] = v;
  });
  return o;
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

  try {
    if (req.method === 'GET' && u.pathname === '/health') {
      return sendJson(res, 200, { ok: true, service: 'bookring-athena-bridge' });
    }

    if (req.method === 'GET' && u.pathname === '/api/athena/status') {
      const oauth = loadConfig({ requirePractice: false });
      const full = loadConfig({ requirePractice: true });
      const oauthMissing = oauth.missing;
      const fullMissing = full.missing;
      const pid = (full.patientId || '').trim();
      return sendJson(res, 200, {
        ok: oauthMissing.length === 0,
        oauthConfigured: oauthMissing.length === 0,
        oauthMissing,
        practiceId: full.practiceId || null,
        readyForAppointments: fullMissing.length === 0,
        appointmentsMissing: fullMissing,
        departmentId: full.departmentId || null,
        patientIdConfigured: !!pid,
        bookedUsesPatientFilter: !!pid,
        apiBase: full.apiBase || null,
      });
    }

    if (req.method === 'GET' && u.pathname === '/api/athena/open-slots') {
      const cfg = loadConfig({ requirePractice: true });
      if (cfg.missing.length) {
        return sendJson(res, 400, { error: 'Missing server config', missing: cfg.missing });
      }
      const dept = u.searchParams.get('departmentid') || cfg.departmentId;
      if (!dept) {
        return sendJson(res, 400, {
          error: 'departmentid required — set ATHENA_DEPARTMENT_ID or pass ?departmentid=',
        });
      }
      const extra = queryExtras(u.searchParams, ['departmentid']);
      const data = await listOpenAppointmentSlots(cfg, { departmentId: dept, extraParams: extra });
      return sendJson(res, 200, { ok: true, practiceId: cfg.practiceId, departmentId: String(dept), data });
    }

    if (req.method === 'GET' && u.pathname === '/api/athena/booked') {
      const cfg = loadConfig({ requirePractice: true });
      if (cfg.missing.length) {
        return sendJson(res, 400, { error: 'Missing server config', missing: cfg.missing });
      }
      const startDate =
        u.searchParams.get('startdate') || u.searchParams.get('startDate');
      const endDate = u.searchParams.get('enddate') || u.searchParams.get('endDate');
      if (!startDate || !endDate) {
        return sendJson(res, 400, {
          error: 'startdate and enddate required (MM/DD/YYYY)',
        });
      }
      const dept = u.searchParams.get('departmentid') || cfg.departmentId;
      if (!dept) {
        return sendJson(res, 400, {
          error: 'departmentid required — set ATHENA_DEPARTMENT_ID or pass ?departmentid=',
        });
      }
      const extra = queryExtras(u.searchParams, [
        'startdate',
        'startDate',
        'enddate',
        'endDate',
        'departmentid',
        'patientid',
        'patientId',
      ]);
      const patientFromUrl =
        (u.searchParams.get('patientid') || u.searchParams.get('patientId') || '').trim();
      const patientDefault = (cfg.patientId || '').trim();
      const patientForAthena = patientFromUrl || patientDefault;
      if (patientForAthena) extra.patientid = patientForAthena;

      const data = await listBookedAppointments(cfg, {
        departmentId: dept,
        startDate,
        endDate,
        extraParams: extra,
      });
      return sendJson(res, 200, {
        ok: true,
        practiceId: cfg.practiceId,
        departmentId: String(dept),
        patientid:
          patientForAthena ||
          undefined,
        data,
      });
    }

    if (req.method === 'POST' && u.pathname === '/api/athena/book') {
      const cfg = loadConfig({ requirePractice: true });
      if (cfg.missing.length) {
        return sendJson(res, 400, { error: 'Missing server config', missing: cfg.missing });
      }
      const patientId = (u.searchParams.get('patientid') || cfg.patientId || '').trim();
      if (!patientId) {
        return sendJson(res, 400, {
          error: 'patientid required — set ATHENA_PATIENT_ID or pass ?patientid=',
        });
      }
      let raw = await readBody(req);
      let body = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          return sendJson(res, 400, { error: 'Invalid JSON body' });
        }
      }
      const appointmentId =
        body.appointmentId || body.appointmentid || u.searchParams.get('appointmentid');
      if (!appointmentId) {
        return sendJson(res, 400, {
          error: 'appointmentId required in JSON body',
        });
      }
      const data = await bookAppointment(cfg, String(appointmentId), patientId, {});
      return sendJson(res, 200, {
        ok: true,
        practiceId: cfg.practiceId,
        patientid: patientId,
        data,
      });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    return sendJson(res, 500, { error: e.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const full = loadConfig({ requirePractice: true });
  console.log(`BookRing Athena bridge  http://${HOST}:${PORT}`);
  console.log(
    `Using ATHENA_PRACTICE_ID=${full.practiceId || '(unset)'}  ATHENA_PATIENT_ID=${full.patientId ? '[set]' : '(unset)'}`,
  );
  console.log(
    'GET /api/athena/booked applies patientid from URL or ATHENA_PATIENT_ID when set; paths use practice id from .env',
  );
});
