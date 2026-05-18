/**
 * OAuth 2.0 client-credentials token for Athena API access.
 * Exact token URL, scopes, and grant types are defined in your Developer Portal app.
 *
 * @see https://docs.athenahealth.com/api/sandbox
 */

let cached = { accessToken: null, expiresAt: 0 };

export async function getAccessToken(cfg) {
  const now = Date.now() / 1000;
  if (cached.accessToken && cached.expiresAt > now + 60) {
    return cached.accessToken;
  }

  const body = new URLSearchParams();
  body.set('grant_type', 'client_credentials');
  body.set('client_id', cfg.clientId);
  body.set('client_secret', cfg.clientSecret);
  if (cfg.scope) body.set('scope', cfg.scope);

  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Athena token error ${res.status}: ${text.slice(0, 500)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Athena token: non-JSON response');
  }

  const accessToken = data.access_token;
  const expiresIn = Number(data.expires_in || 3600);
  if (!accessToken) {
    throw new Error('Athena token: missing access_token in response');
  }

  cached = {
    accessToken,
    expiresAt: now + expiresIn,
  };

  return accessToken;
}

export function clearTokenCache() {
  cached = { accessToken: null, expiresAt: 0 };
}
