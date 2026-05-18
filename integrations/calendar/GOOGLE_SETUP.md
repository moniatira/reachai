# Google Calendar OAuth — setup

Real sign-in uses Google’s OAuth screen (“BookRing wants to access your Google Calendar”).

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. **APIs & Services → Library** → enable **Google Calendar API**.
4. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal for Workspace-only testing).
   - App name, support email, developer contact.
   - Scopes: add `.../auth/calendar.readonly`, `openid`, `email`, `profile`.
   - **Test users**: add your Gmail address while the app is in “Testing”.

## 2. OAuth client credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add exactly:

   ```
   http://127.0.0.1:3849/api/calendar/callback/google
   ```

4. Copy **Client ID** and **Client secret**.

## 3. Local `.env`

```bash
cd integrations/calendar
cp .env.example .env
```

Edit `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
CP_PUBLIC_APP_URL=http://127.0.0.1:3849
CP_FRONTEND_URL=http://127.0.0.1:8765
```

Verify:

```bash
npm run check-env
```

## 4. Run

**Terminal 1 — OAuth bridge**

```bash
npm start
```

**Terminal 2 — static site**

```bash
cd ../..
python -m http.server 8765
```

Open **http://127.0.0.1:8765/provider.html** → sign in (`demo`) → **Sign in with Google Calendar**.

## Troubleshooting

| Error | Fix |
|--------|-----|
| `redirect_uri_mismatch` | Redirect URI in Google Console must match `.env` / `GOOGLE_REDIRECT_URI` exactly |
| `access_denied` | Add your Gmail under OAuth consent screen → Test users |
| Bridge offline | Run `npm start` in `integrations/calendar` |
| `invalid_client` | Check client ID and secret in `.env` |

Tokens are stored in `integrations/calendar/data/sessions.json` (local dev only).
