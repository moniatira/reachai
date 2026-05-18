import { normalizeBusyEvents, rangeIso } from './busy.js';

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile',
];

export function authUrl(cfg, state) {
  const u = new URL(AUTH);
  u.searchParams.set('client_id', cfg.google.clientId);
  u.searchParams.set('redirect_uri', cfg.google.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  u.searchParams.set('include_granted_scopes', 'true');
  u.searchParams.set('state', state);
  return u.toString();
}

export async function exchangeCode(cfg, code) {
  const body = new URLSearchParams({
    code,
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    redirect_uri: cfg.google.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Google token error (${res.status})`);
  }
  if (!data.access_token) throw new Error('Google did not return an access token');
  return data;
}

export async function refreshIfNeeded(cfg, session) {
  if (!session.refreshToken) return session.accessToken;
  if (Date.now() < (session.expiresAt || 0) - 60000) return session.accessToken;

  const body = new URLSearchParams({
    refresh_token: session.refreshToken,
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Google token refresh failed');
  }
  session.accessToken = data.access_token;
  session.expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  if (data.refresh_token) session.refreshToken = data.refresh_token;
  return session.accessToken;
}

export async function fetchProfile(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || data.error_description || 'Google profile error');
  return { email: data.email || '', name: data.name || '' };
}

/** Pull real events from the user's primary Google Calendar. */
export async function fetchBusy(cfg, session, days) {
  const token = await refreshIfNeeded(cfg, session);
  const { timeMin, timeMax } = rangeIso(days);

  const u = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  u.searchParams.set('timeMin', timeMin);
  u.searchParams.set('timeMax', timeMax);
  u.searchParams.set('singleEvents', 'true');
  u.searchParams.set('orderBy', 'startTime');
  u.searchParams.set('maxResults', '250');

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || `Google Calendar API error (${res.status})`);
  }

  const events = (data.items || []).filter((ev) => {
    if (ev.transparency === 'transparent') return false;
    if (ev.status === 'cancelled') return false;
    return true;
  });

  return normalizeBusyEvents(
    events.map((ev) => ({
      title: ev.summary || 'Busy',
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      source: 'calendar',
    })),
  );
}

export function sessionFromToken(tokenData, profile) {
  return {
    provider: 'google',
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + Number(tokenData.expires_in || 3600) * 1000,
    email: profile.email,
    displayName: profile.name,
  };
}
