import { normalizeBusyEvents, rangeIso } from './busy.js';

export function authUrl(cfg, state) {
  const tenant = cfg.microsoft.tenant || 'common';
  const u = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  u.searchParams.set('client_id', cfg.microsoft.clientId);
  u.searchParams.set('redirect_uri', cfg.microsoft.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'offline_access Calendars.Read User.Read');
  u.searchParams.set('state', state);
  return u.toString();
}

export async function exchangeCode(cfg, code) {
  const tenant = cfg.microsoft.tenant || 'common';
  const body = new URLSearchParams({
    code,
    client_id: cfg.microsoft.clientId,
    client_secret: cfg.microsoft.clientSecret,
    redirect_uri: cfg.microsoft.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Microsoft token error');
  return data;
}

async function refreshIfNeeded(cfg, session) {
  if (!session.refreshToken) return session.accessToken;
  if (Date.now() < (session.expiresAt || 0) - 60000) return session.accessToken;
  const tenant = cfg.microsoft.tenant || 'common';
  const body = new URLSearchParams({
    refresh_token: session.refreshToken,
    client_id: cfg.microsoft.clientId,
    client_secret: cfg.microsoft.clientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Microsoft refresh failed');
  session.accessToken = data.access_token;
  session.expiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return session.accessToken;
}

export async function fetchProfile(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Microsoft profile error');
  return {
    email: data.mail || data.userPrincipalName || '',
    name: data.displayName || '',
  };
}

export async function fetchBusy(cfg, session, days) {
  const token = await refreshIfNeeded(cfg, session);
  const { timeMin, timeMax } = rangeIso(days);
  const u = new URL('https://graph.microsoft.com/v1.0/me/calendarView');
  u.searchParams.set('startDateTime', timeMin);
  u.searchParams.set('endDateTime', timeMax);
  u.searchParams.set('$select', 'subject,start,end,showAs');
  u.searchParams.set('$top', '250');

  const res = await fetch(u.toString(), {
    headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Microsoft calendar error');

  return normalizeBusyEvents(
    (data.value || []).map((ev) => ({
      title: ev.subject || 'Outlook busy',
      start: ev.start,
      end: ev.end,
      source: 'calendar',
    })),
  );
}

export function sessionFromToken(tokenData, profile) {
  return {
    provider: 'microsoft',
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + Number(tokenData.expires_in || 3600) * 1000,
    email: profile.email,
    displayName: profile.name,
  };
}
