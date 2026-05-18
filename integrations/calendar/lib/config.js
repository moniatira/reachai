const PROVIDERS = ['google', 'microsoft', 'calendly'];

export function loadConfig() {
  const publicUrl = (process.env.CP_PUBLIC_APP_URL || `http://127.0.0.1:${process.env.CP_CALENDAR_BRIDGE_PORT || 3849}`).replace(/\/$/, '');
  const frontendUrl = (process.env.CP_FRONTEND_URL || 'http://127.0.0.1:8765').replace(/\/$/, '');

  const google = {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.GOOGLE_REDIRECT_URI || `${publicUrl}/api/calendar/callback/google`).trim(),
  };

  const microsoft = {
    clientId: (process.env.MS_CLIENT_ID || '').trim(),
    clientSecret: (process.env.MS_CLIENT_SECRET || '').trim(),
    tenant: (process.env.MS_TENANT || 'common').trim(),
    redirectUri: (process.env.MS_REDIRECT_URI || `${publicUrl}/api/calendar/callback/microsoft`).trim(),
  };

  const calendly = {
    clientId: (process.env.CALENDLY_CLIENT_ID || '').trim(),
    clientSecret: (process.env.CALENDLY_CLIENT_SECRET || '').trim(),
    redirectUri: (process.env.CALENDLY_REDIRECT_URI || `${publicUrl}/api/calendar/callback/calendly`).trim(),
  };

  function missing(p) {
    const m = [];
    if (!p.clientId) m.push('clientId');
    if (!p.clientSecret) m.push('clientSecret');
    return m;
  }

  return {
    publicUrl,
    frontendUrl,
    google,
    microsoft,
    calendly,
    configured(provider) {
      const map = { google, microsoft, calendly };
      const p = map[provider];
      return p && missing(p).length === 0;
    },
    status() {
      return {
        google: { configured: missing(google).length === 0, missing: missing(google) },
        microsoft: { configured: missing(microsoft).length === 0, missing: missing(microsoft) },
        calendly: { configured: missing(calendly).length === 0, missing: missing(calendly) },
      };
    },
  };
}

export function normalizeProvider(raw) {
  const p = String(raw || '').toLowerCase();
  if (p === 'outlook' || p === 'office365' || p === 'microsoft') return 'microsoft';
  if (p === 'gmail' || p === 'google') return 'google';
  if (p === 'calendly' || p === 'other') return 'calendly';
  return p;
}

export { PROVIDERS };
