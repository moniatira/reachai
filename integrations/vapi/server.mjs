/**
 * Vapi tool-call webhook for phone booking demo.
 * Run: npm run webhook  (then expose with ngrok and set tool Server URL in Vapi dashboard)
 */
import http from 'http';
import { URL } from 'url';

const HOST = process.env.CP_VAPI_WEBHOOK_HOST || '127.0.0.1';
const PORT = Number(process.env.CP_VAPI_WEBHOOK_PORT || 3848);

const bookings = [];

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
      if (raw.length > 2e6) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildDemoSlots() {
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let d = 1; d <= 7 && out.length < 12; d++) {
    const dt = new Date(base);
    dt.setDate(dt.getDate() + d);
    if (dt.getDay() === 0 || dt.getDay() === 6) continue;
    for (let h = 9; h < 16; h += 2) {
      const date = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
      const time = `${pad(h)}:00`;
      const end = `${pad(h + 1)}:00`;
      out.push({ date, time, end, display: `${date} at ${time}` });
    }
  }
  return out;
}

function handleToolCalls(body) {
  const msg = body?.message || body;
  const list = msg?.toolCallList || msg?.toolCalls || [];
  const results = [];

  for (const tc of list) {
    const id = tc.id || tc.toolCallId;
    const name = tc.name || tc.function?.name;
    const args = tc.arguments || tc.function?.arguments || {};

    if (name === 'list_available_slots') {
      const slots = buildDemoSlots().slice(0, 8);
      results.push({
        toolCallId: id,
        result: JSON.stringify({
          slots: slots.map((s) => s.display),
          message: 'Offer these times to the caller.',
        }),
      });
    } else if (name === 'book_appointment') {
      const booking = {
        customerName: args.customer_name || args.name || 'Customer',
        service: args.service || 'Appointment',
        date: args.date || '',
        time: args.time || '',
        createdAt: new Date().toISOString(),
      };
      bookings.unshift(booking);
      results.push({
        toolCallId: id,
        result: JSON.stringify({
          confirmed: true,
          message: `Booked ${booking.service} for ${booking.customerName} on ${booking.date} at ${booking.time}.`,
        }),
      });
    } else {
      results.push({
        toolCallId: id,
        result: JSON.stringify({ error: 'Unknown tool: ' + name }),
      });
    }
  }

  return { results };
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
      return sendJson(res, 200, { ok: true, service: 'bookring-vapi-webhook' });
    }

    if (req.method === 'GET' && u.pathname === '/api/bookings') {
      return sendJson(res, 200, { bookings: bookings.slice(0, 20) });
    }

    if (req.method === 'POST' && (u.pathname === '/webhook' || u.pathname === '/')) {
      const raw = await readBody(req);
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
      const out = handleToolCalls(body);
      return sendJson(res, 200, out);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`BookRing Vapi webhook http://${HOST}:${PORT}`);
  console.log('  POST /webhook  — Vapi tool calls');
  console.log('  GET  /api/bookings — demo feed for demo.html');
});
