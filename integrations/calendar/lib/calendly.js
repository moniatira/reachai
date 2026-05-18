import { normalizeBusyEvents, rangeIso } from './busy.js';

const AUTH = 'https://auth.calendly.com/oauth/authorize';
const TOKEN = 'https://auth.calendly.com/oauth/token';

export function authUrl(cfg, state) {
  const u = new URL(AUTH);
  u.searchParams.set('client_id', cfg.calendly.clientId);
  u.searchParams.set('redirect_uri', cfg.calendly.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);
  return u.toString();
}

export async function exchangeCode(cfg, code) {
  const body = new URLSearchParams({
    code,
    client_id: cfg.calendly.clientId,
    client_secret: cfg.calendly.clientSecret,
    redirect_uri: cfg.calendly.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Calendly token error');
  return data;
}

export async function fetchProfile(accessToken) {
  const res = await fetch('https://api.calendly.com/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.title || 'Calendly profile error');
  const u = data.resource || {};
  return {
    email: u.email || '',
    name: u.name || '',
    userUri: u.uri || '',
  };
}

export async function fetchBusy(cfg, session, days) {
  const token = session.accessToken;
  let userUri = session.calendlyUserUri;
  if (!userUri) {
    const profile = await fetchProfile(token);
    userUri = profile.userUri;
    session.calendlyUserUri = userUri;
  }
  const { timeMin, timeMax } = rangeIso(days);
  const u = new URL('https://api.calendly.com/scheduled_events');
  u.searchParams.set('user', userUri);
  u.searchParams.set('min_start_time', timeMin);
  u.searchParams.set('max_start_time', timeMax);
  u.searchParams.set('status', 'active');

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.title || 'Calendly events error');

  return normalizeBusyEvents(
    (data.collection || []).map((ev) => ({
      title: ev.name || 'Calendly booking',
      start: ev.start_time,
      end: ev.end_time,
      source: 'calendar',
    })),
  );
}

export function sessionFromToken(tokenData, profile) {
  return {
    provider: 'calendly',
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + Number(tokenData.expires_in || 7200) * 1000,
    email: profile.email,
    displayName: profile.name,
    calendlyUserUri: profile.userUri,
  };
}
