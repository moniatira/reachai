export async function athenaGet(cfg, token, pathAndQuery) {
  const url = `${cfg.apiBase}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Athena GET ${res.status} ${url}: ${text.slice(0, 800)}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Athena GET: non-JSON body from ${url}`);
  }
}

export async function athenaPut(cfg, token, pathAndQuery, bodyParams) {
  const url = `${cfg.apiBase}${pathAndQuery.startsWith('/') ? '' : '/'}${pathAndQuery}`;
  const body = new URLSearchParams();
  if (bodyParams && typeof bodyParams === 'object') {
    Object.keys(bodyParams).forEach((k) => {
      if (bodyParams[k] != null && bodyParams[k] !== '') body.set(k, String(bodyParams[k]));
    });
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Athena PUT ${res.status} ${url}: ${text.slice(0, 800)}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
