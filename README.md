# ReachAI — Deploy Guide

Self-serve AI scheduling platform for SMBs. Voice + chat + SMS + email,
connected to Google Calendar, Outlook, Cal.com, or Calendly.

## What's in this zip

```
reachai/
├── index.html         Landing page
├── integrations.html  4 calendar systems + 4 channels detail
├── provider.html      Self-serve dashboard (6 tabs)
├── pricing.html       3 tiers: $49 / $129 / $349
├── get-started.html   5-step setup wizard
├── demo.html          Interactive demo of all 4 channels
└── styles.css         Shared design system
```

## Brand

- Name: **ReachAI**
- Tagline: **Your business, always answered.**
- Primary color: indigo `#534AB7`
- Logo mark: `R∙` (compact, works at any size)

## Option A — Replace existing bookring repo content

This keeps your existing GitHub Pages URL working while the rebrand
catches up. Best for soft launch.

```powershell
# Navigate to your local clone of the bookring repo
cd C:\path\to\bookring-repo

# Delete the old files
rm index.html, integrations.html, provider.html, pricing.html, get-started.html, demo.html, styles.css

# Copy in the new ReachAI files
# (extract this zip and copy all 7 files into the repo root)

# Commit and push
git add .
git commit -m "rebrand: BookRing → ReachAI, expand to 4 channels + 4 calendar integrations"
git push origin main
```

Your URL `https://moniatira.github.io/bookring/` will serve the new
ReachAI site within 1–2 minutes.

## Option B — Create a fresh ReachAI repo (recommended)

Clean break from the bookring name in the URL too.

```powershell
# Create new repo on GitHub called 'reachai' or 'reachai-site'
gh repo create reachai --public --description "ReachAI — AI front desk for SMBs"

# Clone it locally
git clone https://github.com/moniatira/reachai.git
cd reachai

# Copy all 7 files into this folder, then:
git add .
git commit -m "init: ReachAI site — voice, chat, SMS, email + 4 calendar integrations"
git push origin main

# Enable GitHub Pages in repo settings → Pages → Source: main branch / root
```

New URL: `https://moniatira.github.io/reachai/`

## Option C — Custom domain

Once you've claimed `reachai.com` (or any other domain):

1. Create a `CNAME` file in the repo root containing your domain:
   ```
   reachai.com
   ```
2. At your DNS provider, add CNAME record pointing to `moniatira.github.io`
3. In GitHub Settings → Pages, set the custom domain to `reachai.com`
4. Enable "Enforce HTTPS"

DNS propagation takes 1–24 hours.

## What changed from BookRing

| Aspect | BookRing | ReachAI |
|--------|----------|---------|
| Brand name | BookRing | ReachAI |
| Tagline | Every ring becomes a booking | Your business, always answered |
| Logo mark | BR | R∙ |
| Channels | Phone + chat (2) | Voice + chat + SMS + email (4) |
| Calendar integrations | Generic mention | Google, Outlook, Cal.com, Calendly (4 specific) |
| Dashboard | Stub page | 6 configurable tabs (Overview/Assistant/Channels/Calendar/Services/Embed) |
| Pricing | 1 plan generic | 3 tiers ($49/$129/$349) |
| Onboarding | Sign-up link | Full 5-step interactive wizard |
| Demo | Single phone example | 4-tab interactive demo (voice/chat/SMS/email) |

## Brand assets that need replacing if you keep the old repo

Search and replace these tokens in any other places they appear
(blog posts, social profiles, email signatures):

- `BookRing` → `ReachAI`
- `bookring.io` → `reachai.com`
- `Every ring becomes a booking` → `Your business, always answered`
- `BR` logo → `R∙` logo

## Need to update favicon

The HTML uses an inline SVG favicon — no separate file needed.
The "R∙" mark renders cleanly at 16px in browser tabs.

---

© ReachAI 2026
