/* ============================================================
 * ReachAI wizard — state + API + step navigation
 * Day 4 of self-serve build
 * ============================================================ */

const API_BASE = 'https://reachai-api.onrender.com';
const STORAGE_KEY = 'reachai_wizard_state';

/* ── State management ─────────────────────────────────────── */

const initialState = {
  step: 1,
  email: '',
  session_token: '',
  workspace_id: '',
  slug: '',
  business_name: '',
  industry: '',
  website_url: '',
  extracted: null,
  calendar_provider: '',
  calendar_email: '',
  assistant_name: 'Sarah',
  greeting: "Hi! I'm Sarah. How can I help you today?",
  tone: 'warm',
  brand_color: '#534AB7',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...initialState };
    return { ...initialState, ...JSON.parse(raw) };
  } catch (e) {
    return { ...initialState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save wizard state:', e);
  }
}

function resetState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  state = { ...initialState };
}

let state = loadState();

/* ── API helpers ──────────────────────────────────────────── */

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.session_token) {
    headers['Authorization'] = `Bearer ${state.session_token}`;
  }

  let response;
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(`Network error: could not reach ReachAI server. ${e.message}`);
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = await response.json(); } catch (e) { /* empty body */ }
  } else {
    data = { text: await response.text() };
  }

  if (!response.ok) {
    const detail = (data && (data.detail || data.message)) || `HTTP ${response.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  return data;
}

function showError(message) {
  const banner = document.getElementById('error-banner');
  document.getElementById('error-message').textContent = message;
  banner.hidden = false;
  setTimeout(() => { banner.hidden = true; }, 8000);
}

document.getElementById('error-close').addEventListener('click', () => {
  document.getElementById('error-banner').hidden = true;
});

/* ── Step navigation ──────────────────────────────────────── */

function showStep(n) {
  state.step = n;
  saveState();

  document.querySelectorAll('.step-panel').forEach(p => {
    p.hidden = parseInt(p.dataset.step, 10) !== n;
  });

  document.querySelectorAll('.step-rail .step').forEach(s => {
    const sn = parseInt(s.dataset.step, 10);
    s.classList.remove('current', 'done');
    if (sn < n) s.classList.add('done');
    if (sn === n) s.classList.add('current');
  });

  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ignore */ }
}

/* ── Magic link callback (URL hash) ───────────────────────── */

function parseHashParams() {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const params = {};
  hash.split('&').forEach(part => {
    const [k, v] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return params;
}

async function handleMagicLinkReturn() {
  const params = parseHashParams();

  if (params.session) {
    state.session_token = params.session;
    saveState();

    // Verify the token and load user info
    try {
      const me = await api('GET', '/v1/auth/me');
      state.email = me.email;
      saveState();
    } catch (e) {
      showError(`Sign-in failed: ${e.message}. Please request a new link.`);
      window.history.replaceState({}, '', window.location.pathname);
      showStep(1);
      return;
    }

    // Clear the hash so refreshing doesn't try to re-use the token
    window.history.replaceState({}, '', window.location.pathname);

    // If user is mid-wizard, drop them back where they were
    if (state.workspace_id && state.step > 2) {
      showStep(state.step);
    } else {
      showStep(2);
    }
  }
}

/* ============================================================
 * STEP 1 — Email
 * ============================================================ */

document.getElementById('step1-submit').addEventListener('click', async () => {
  const email = document.getElementById('step1-email').value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    showError('Please enter a valid email address.');
    return;
  }

  const btn = document.getElementById('step1-submit');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    await api('POST', '/v1/auth/request-link', { email });
    state.email = email;
    saveState();
    document.getElementById('step1-sent-email').textContent = email;
    document.getElementById('step1-sent').hidden = false;
    btn.textContent = 'Send sign-in link →';
  } catch (e) {
    showError(`Could not send link: ${e.message}`);
    btn.disabled = false;
    btn.textContent = 'Send sign-in link →';
  }
});

document.getElementById('step1-resend').addEventListener('click', async (ev) => {
  ev.preventDefault();
  if (state.email) {
    try {
      await api('POST', '/v1/auth/request-link', { email: state.email });
      showError('New sign-in link sent — check your inbox.');
    } catch (e) {
      showError(`Resend failed: ${e.message}`);
    }
  }
});

document.getElementById('step1-have-session').addEventListener('click', (ev) => {
  ev.preventDefault();
  const token = prompt('Paste your session token here:');
  if (token) {
    window.location.hash = `session=${encodeURIComponent(token.trim())}`;
    window.location.reload();
  }
});

/* ============================================================
 * STEP 2 — Business
 * ============================================================ */

// Restore previous values if returning
function hydrateStep2() {
  if (state.business_name) document.getElementById('step2-name').value = state.business_name;
  if (state.industry) document.getElementById('step2-industry').value = state.industry;
  if (state.website_url) document.getElementById('step2-website').value = state.website_url;
  if (state.extracted) {
    renderExtraction(state.extracted);
  }
}

document.getElementById('step2-back').addEventListener('click', () => showStep(1));

document.getElementById('step2-submit').addEventListener('click', async () => {
  const name = document.getElementById('step2-name').value.trim();
  const industry = document.getElementById('step2-industry').value;
  const website = document.getElementById('step2-website').value.trim();

  if (!name) {
    showError('Business name is required.');
    return;
  }

  const btn = document.getElementById('step2-submit');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    // Create workspace (or reuse if already created)
    if (!state.workspace_id) {
      const ws = await api('POST', '/v1/onboarding/start', { business_name: name });
      state.workspace_id = ws.id;
      state.slug = ws.slug;
      saveState();
    }

    // Save business info
    const body = { workspace_id: state.workspace_id };
    if (name) body.business_name = name;
    if (industry) body.industry = industry;
    if (website) body.website_url = website.startsWith('http') ? website : `https://${website}`;

    await api('PATCH', '/v1/onboarding/business', body);
    state.business_name = name;
    state.industry = industry;
    state.website_url = body.website_url || '';
    saveState();

    // If website provided AND extraction not yet done, trigger extraction
    if (state.website_url && !state.extracted) {
      btn.textContent = 'Reading your website…';
      document.getElementById('extract-status').hidden = false;
      document.getElementById('extract-spinner').hidden = false;

      try {
        const extractResult = await api('POST', `/v1/workspaces/${state.slug}/extract`, {
          website_url: state.website_url,
        });
        state.extracted = extractResult.extracted;
        saveState();
        renderExtraction(state.extracted);
        // Don't auto-advance — let user see what was extracted, click Continue again
        btn.disabled = false;
        btn.textContent = 'Looks good — continue →';
        return;
      } catch (e) {
        // Extraction failed — not fatal, continue without it
        document.getElementById('extract-status').hidden = true;
        console.warn('Extraction failed:', e);
      }
    }

    showStep(3);
  } catch (e) {
    showError(`Could not save business info: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = state.extracted ? 'Looks good — continue →' : 'Continue →';
  }
});

function renderExtraction(extracted) {
  document.getElementById('extract-spinner').hidden = true;
  const result = document.getElementById('extract-result');
  result.hidden = false;

  let html = '<div class="extract-card"><div class="extract-card-head">✓ Your AI now knows your business</div>';

  if (extracted.business_summary) {
    html += `<div class="extract-row"><span class="extract-label">Summary:</span> ${escapeHtml(extracted.business_summary)}</div>`;
  }

  const services = extracted.services || [];
  if (services.length > 0) {
    html += `<div class="extract-row"><span class="extract-label">Found ${services.length} service${services.length === 1 ? '' : 's'}:</span><ul class="extract-services">`;
    services.slice(0, 6).forEach(s => {
      html += `<li><strong>${escapeHtml(s.name || 'Untitled')}</strong>`;
      if (s.description) html += ` — ${escapeHtml(s.description)}`;
      html += '</li>';
    });
    html += '</ul></div>';
  }

  const contact = extracted.contact || {};
  if (contact.email || contact.phone) {
    html += `<div class="extract-row"><span class="extract-label">Contact:</span> `;
    if (contact.email) html += `${escapeHtml(contact.email)} `;
    if (contact.phone) html += `· ${escapeHtml(contact.phone)}`;
    html += `</div>`;
  }

  html += '</div>';
  result.innerHTML = html;
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/* ============================================================
 * STEP 3 — Calendar
 * ============================================================ */

document.getElementById('step3-back').addEventListener('click', () => showStep(2));

document.getElementById('cal-calendly').addEventListener('click', () => connectCalendar('calendly'));
document.getElementById('cal-google').addEventListener('click', () => connectCalendar('google'));

async function connectCalendar(provider) {
  state.calendar_provider = provider;
  saveState();

  document.getElementById('cal-status').hidden = false;
  document.getElementById('cal-status-text').textContent = `Opening ${provider === 'google' ? 'Google' : 'Calendly'} authorization…`;

  // Save state so we can resume after OAuth callback
  // The OAuth callback redirects to the API's success page, NOT back here.
  // So we open OAuth in a popup, and poll the calendar status endpoint to detect connection.
  const connectUrl = `${API_BASE}/v1/${provider}/connect/${state.slug}`;
  const popup = window.open(connectUrl, 'reachai_oauth', 'width=600,height=720');

  if (!popup) {
    showError('Please allow popups to authorize your calendar, then try again.');
    document.getElementById('cal-status').hidden = true;
    return;
  }

  // Poll for connection (every 2 seconds, up to 5 minutes)
  let attempts = 0;
  const maxAttempts = 150;
  const pollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(pollInterval);
      document.getElementById('cal-status').hidden = true;
      showError('Calendar connection timed out. Please try again.');
      return;
    }

    // If popup is closed, do one more check then stop
    if (popup.closed) {
      try {
        const status = await api('GET', `/v1/calendar/status/${state.slug}`);
        const conn = (status.connections || []).find(c => c.provider === provider);
        if (conn) {
          clearInterval(pollInterval);
          markCalendarConnected(conn);
          return;
        }
      } catch (e) {
        // Auth might have failed silently
      }
      clearInterval(pollInterval);
      document.getElementById('cal-status').hidden = true;
      // Don't show error if popup was just closed without connecting — user may have cancelled
      return;
    }

    // Popup still open — check connection status
    try {
      const status = await api('GET', `/v1/calendar/status/${state.slug}`);
      const conn = (status.connections || []).find(c => c.provider === provider);
      if (conn) {
        clearInterval(pollInterval);
        try { popup.close(); } catch (e) {}
        markCalendarConnected(conn);
      }
    } catch (e) {
      // Workspace might not exist yet (race condition) — keep polling
    }
  }, 2000);
}

function markCalendarConnected(conn) {
  state.calendar_email = conn.account_email || '';
  saveState();

  document.getElementById('cal-status').hidden = true;
  document.getElementById('cal-connected').hidden = false;
  const providerName = state.calendar_provider === 'google' ? 'Google Calendar' : 'Calendly';
  document.getElementById('cal-connected-name').textContent = `${providerName} connected`;
  document.getElementById('cal-connected-detail').textContent = conn.account_email
    ? `as ${conn.account_email}`
    : 'authorized successfully';

  document.getElementById('step3-continue').disabled = false;

  // Highlight the picked card
  document.querySelectorAll('.cal-card').forEach(c => c.classList.remove('cal-card-picked'));
  const pickedCard = document.querySelector(`.cal-card[data-provider="${state.calendar_provider}"]`);
  if (pickedCard) pickedCard.classList.add('cal-card-picked');
}

document.getElementById('step3-continue').addEventListener('click', () => showStep(4));

// On step 3 load, check if calendar is already connected (returning from OAuth)
async function hydrateStep3() {
  if (!state.slug) return;
  try {
    const status = await api('GET', `/v1/calendar/status/${state.slug}`);
    const conn = (status.connections || []).find(c => c.provider === state.calendar_provider) || status.connections[0];
    if (conn) {
      state.calendar_provider = conn.provider;
      markCalendarConnected(conn);
    }
  } catch (e) {
    // Workspace not yet set up — that's fine
  }
}

/* ============================================================
 * STEP 4 — Assistant
 * ============================================================ */

function hydrateStep4() {
  document.getElementById('step4-name').value = state.assistant_name || 'Sarah';
  document.getElementById('step4-tone').value = state.tone || 'warm';
  document.getElementById('step4-greeting').value = state.greeting || "Hi! I'm Sarah. How can I help you today?";
  document.getElementById('step4-color').value = state.brand_color || '#534AB7';
  document.getElementById('step4-color-text').value = state.brand_color || '#534AB7';
  updatePreview();
}

function updatePreview() {
  const name = document.getElementById('step4-name').value || 'Sarah';
  const greeting = document.getElementById('step4-greeting').value || `Hi! I'm ${name}. How can I help you today?`;
  const color = document.getElementById('step4-color').value || '#534AB7';

  document.getElementById('preview-assistant-name').textContent = name;
  document.getElementById('preview-greeting').textContent = greeting;
  document.getElementById('preview-head').style.background = color;
  document.querySelectorAll('.chat-mock-bot').forEach(el => {
    el.style.borderColor = color + '33';
  });
  document.querySelectorAll('.chat-mock-user').forEach(el => {
    el.style.background = color;
  });
}

['step4-name', 'step4-tone', 'step4-greeting', 'step4-color', 'step4-color-text'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      // Sync color picker and text input
      if (id === 'step4-color') document.getElementById('step4-color-text').value = el.value;
      if (id === 'step4-color-text') {
        const v = el.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(v)) document.getElementById('step4-color').value = v;
      }
      updatePreview();
    });
  }
});

document.getElementById('step4-back').addEventListener('click', () => showStep(3));

document.getElementById('step4-submit').addEventListener('click', async () => {
  const btn = document.getElementById('step4-submit');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  state.assistant_name = document.getElementById('step4-name').value.trim() || 'Sarah';
  state.tone = document.getElementById('step4-tone').value;
  state.greeting = document.getElementById('step4-greeting').value.trim();
  state.brand_color = document.getElementById('step4-color').value;
  saveState();

  try {
    await api('PATCH', '/v1/onboarding/assistant', {
      workspace_id: state.workspace_id,
      assistant_name: state.assistant_name,
      greeting: state.greeting,
      tone: state.tone,
      brand_primary: state.brand_color,
    });

    // Try to complete onboarding — may fail if calendar not connected (shouldn't happen)
    try {
      await api('POST', '/v1/onboarding/complete', { workspace_id: state.workspace_id });
    } catch (e) {
      console.warn('Complete failed:', e);
    }

    showStep(5);
    hydrateStep5();
  } catch (e) {
    showError(`Could not save assistant settings: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue →';
  }
});

/* ============================================================
 * STEP 5 — Install
 * ============================================================ */

function hydrateStep5() {
  const embedCode = `<script src="${API_BASE}/v1/widget/${state.slug}.js" async><\/script>`;
  document.getElementById('embed-code').textContent = embedCode;
  document.getElementById('step5-dashboard').href = `provider.html?slug=${encodeURIComponent(state.slug)}`;
}

document.getElementById('embed-copy').addEventListener('click', async () => {
  const code = document.getElementById('embed-code').textContent;
  const btn = document.getElementById('embed-copy');
  try {
    await navigator.clipboard.writeText(code);
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = 'Copy code'; }, 2000);
  } catch (e) {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = 'Copy code'; }, 2000);
  }
});

/* ============================================================
 * Initial render
 * ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check if returning from magic link
  if (window.location.hash.includes('session=')) {
    await handleMagicLinkReturn();
  } else if (state.session_token && state.step > 1) {
    // Already have a session, restore wizard position
    showStep(state.step);
  } else {
    // Fresh visit
    showStep(1);
  }

  // 2. Hydrate forms with saved values
  hydrateStep2();
  hydrateStep4();
  if (state.step === 3) hydrateStep3();
  if (state.step === 5) hydrateStep5();
});
