# Calendar OAuth bridge

Real sign-in for **Google Calendar (Gmail)**, **Microsoft Outlook**, and **Calendly**. Secrets stay in `.env` on this server—never in the browser.

## Quick start

```bash
cd integrations/calendar
cp .env.example .env
# Fill in OAuth client IDs/secrets (see below)
npm start
```

Serve the site from another terminal (same machine):

```bash
python -m http.server 8765
```

Open `http://127.0.0.1:8765/provider.html` → **Integrations** → choose provider → **Connect calendar**. You will be redirected to Google / Microsoft / Calendly to approve access, then returned with live busy times.

## OAuth app setup

### Google (Gmail / Google Calendar)

See **[GOOGLE_SETUP.md](./GOOGLE_SETUP.md)** for step-by-step setup (consent screen, test users, redirect URI).

Quick: redirect URI `http://127.0.0.1:3849/api/calendar/callback/google` → set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env`. Test URL: `npm run google-auth-url`.

### Microsoft Outlook

1. [Azure Portal](https://portal.azure.com/) → **App registrations** → New registration.
2. Redirect URI (Web): `http://127.0.0.1:3849/api/calendar/callback/microsoft`
3. **API permissions** → add delegated: `Calendars.Read`, `User.Read`, `offline_access`.
4. Create a client secret → copy Application (client) ID and secret to `.env` as `MS_CLIENT_ID` / `MS_CLIENT_SECRET`.

### Calendly

1. [Calendly Developer](https://developer.calendly.com/) → create OAuth application.
2. Redirect URI: `http://127.0.0.1:3849/api/calendar/callback/calendly`
3. Copy Client ID and Secret to `.env`.

## Environment

| Variable | Purpose |
|----------|---------|
| `CP_CALENDAR_BRIDGE_PORT` | Default `3849` |
| `CP_PUBLIC_APP_URL` | This server’s public URL (redirect URIs) |
| `CP_FRONTEND_URL` | Your static site origin (e.g. `http://127.0.0.1:8765`) |

Run `npm run check-env` to see which providers are configured.

## API (used by `assets/calendar-oauth.js`)

| Endpoint | Description |
|----------|-------------|
| `GET /api/calendar/auth/{google\|microsoft\|calendly}?session=&returnUrl=` | Start OAuth |
| `GET /api/calendar/callback/...` | OAuth return (browser redirect) |
| `GET /api/calendar/connection?session=` | Connection status |
| `GET /api/calendar/busy?session=&days=21` | Fetch busy blocks |
| `POST /api/calendar/disconnect` | Revoke local session |

## Production notes

- Use HTTPS and a real domain for redirect URIs.
- Replace in-memory session store (`lib/store.js`) with Redis or a database.
- Do not commit `.env`.
