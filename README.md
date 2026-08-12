# Meta Social Manager

> Instagram analytics + Boost Post POC using Meta Graph / Marketing APIs, React, TypeScript, Vite, Cloudflare Pages Functions, and Express (local only).

![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)
![React](https://img.shields.io/badge/Frontend-React-blue.svg)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)
![Cloudflare Pages](https://img.shields.io/badge/Production-Cloudflare_Pages-orange.svg)

---

## Overview

**Meta Social Manager** connects an Instagram Business/Creator account via a Meta access token, shows profile/media/insights, and includes a Boost Post flow (Create Boost stays locked until the Meta app is Live and a Privacy Policy URL is configured).

**Production:** one Cloudflare Pages URL serves the React app + Pages Functions (`/api/*`) + `/privacy-policy`.

**Local:** Express (`server/`) and/or Vite remain available for development.

---

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide, Sonner
- **Production API**: Cloudflare Pages Functions (`functions/`)
- **Local API**: Express (`server/`) — development only
- **Meta**: Graph API v21.0+ (read) · Marketing API v25.0 (Boost)

---

## Repository Structure

```text
Meta-Social-Manager/
├── client/                      # React + Vite
│   ├── public/privacy-policy.html
│   └── src/
├── functions/                   # Cloudflare Pages Functions (/api/*)
│   ├── api/[[path]].ts
│   └── _shared/
├── server/                      # Express (local only)
├── wrangler.toml                # Pages output dir + compatibility_date
├── .env.example
├── package.json
└── README.md
```

---

## Cloudflare Pages (production — single URL)

GitHub: `https://github.com/omkar2117/Meta-Social-Manager.git`

Recommended dashboard settings (keep **repository root**, do not set root to `client/` or Functions will not deploy):

| Setting | Value |
|--------|--------|
| Production branch | `main` |
| Root directory | `/` (empty / repo root) |
| Build command | `npm run build:pages` |
| Build output directory | `client/dist` |

**Do not set `VITE_API_BASE_URL` in Cloudflare.** Production builds force same-origin `/api/*`.

Recommended Production env vars (Create Boost unlocked when Meta App is Live):

| Variable | Value |
|----------|--------|
| `META_APP_MODE` | `live` |
| `META_PRIVACY_POLICY_CONFIGURED` | `true` |

These are also set in `wrangler.toml` `[vars]` so Git deploys do not re-lock Boost.

Same-origin paths after deploy:

- `/`
- `/privacy-policy`
- `/api/health`
- `/api/meta/*`
- `/api/boost/*`

---

## Local development

```bash
git clone https://github.com/omkar2117/Meta-Social-Manager.git
cd Meta-Social-Manager
npm run install:all
cp .env.example server/.env

# Express + Vite (set VITE_API_BASE_URL=http://localhost:3001 for Vite)
npm run dev:server
npm run dev:client

# Or production-like same-origin preview
npm run build:pages
npm run pages:dev
# open http://localhost:3001
```

---

## API (same-origin in production)

| Method | Endpoint | Notes |
|--------|----------|--------|
| GET | `/api/health` | Health |
| POST | `/api/meta/connect` | Token → Page → IG → media/insights |
| GET | `/api/boost/readiness` | Pre-Live Create Boost gate |
| POST | `/api/boost/create` | Locked unless Live + Privacy configured |

---

## License

MIT — see [`LICENSE`](./LICENSE).
