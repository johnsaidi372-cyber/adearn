# AdEarn

A full-stack demo web app where users watch short ads, earn coins, and request cashouts.

> **Note:** This is a demo. Ads are simulated content and no real money is transferred.

## Features

- **Accounts** — register, log in, persistent sessions (token in localStorage)
- **Dashboard** — balance, coin count, total earned, ads watched, cashout progress, recent activity
- **Watch ads** — browse a catalog of sponsored ads with a server-validated countdown timer; claim rewards when the timer ends
- **History** — filterable log of earnings and withdrawals
- **Withdrawals** — choose an amount and payout method, submit a request, and track its status
- **One-time verification fee** — a single $3 fee on the first withdrawal, deducted from the user's own balance (never paid out-of-pocket), charged once per account with a bold on-screen notice that no further facilitation fees will be requested
- **Persistence** — data is stored in a JSON file on the server (`server/data/db.json`)

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, lucide-react |
| Backend | Node.js, Express 4, CORS |
| Storage | JSON file (no database server required) |

## Getting started

You need **Node.js 18+** installed. Check with `node --version`.

```bash
cd ad-earn-app
npm install
npm run dev
```

This starts both servers via `concurrently`:

- Frontend → http://localhost:5173
- API → http://localhost:3001

Vite proxies `/api` requests to the Express server, so everything works from the frontend URL.

### Demo account

- Email: `demo@adearn.com`
- Password: `demo1234`

Or click **“Try the demo account”** on the login page. You can also register a new account; new users get 50 welcome coins.

### Admin account

- Email: `admin@adearn.com`
- Password: `admin1234` (override with the `ADMIN_PASSWORD` environment variable)

Sign in with this account to open the **Admin** page, where you can see every user's balance, earnings, ads watched, fee status, and activity, plus all withdrawal requests (which you can mark as paid or rejected).

## Production build

```bash
npm run build   # outputs dist/
npm start       # serves dist/ and the API together on http://localhost:3001
```

## API endpoints

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/me` | Yes | Current user + stats |
| GET | `/api/ads` | Yes | List available ads |
| POST | `/api/ads/start` | Yes | Start a timed ad session |
| POST | `/api/ads/complete` | Yes | Claim reward (server checks elapsed time) |
| GET | `/api/transactions` | Yes | Transaction log |
| GET | `/api/withdrawals` | Yes | Withdrawal requests |
| POST | `/api/withdrawals` | Yes | Request a cashout |

Authenticated endpoints expect `Authorization: Bearer <token>`.

## Configuration

Edit constants at the top of `server/index.js`:

- `USD_PER_COIN` — conversion rate (default `0.01`, i.e. 100 coins = $1)
- `MIN_WITHDRAWAL_USD` — minimum cashout (default $5)
- `ADS` — the demo ad catalog (brand, reward, duration, category, etc.)
- `AFFILIATE_URL` — destination opened when an ad's call-to-action is clicked (default `https://jforce.jumia.co.ke/affiliate`, Jumia's JForce affiliate portal). Individual ads can override it with a `targetUrl` field.

To reset all data, delete `server/data/db.json` and restart the server.

## Deploying to Render (permanent URL)

`render.yaml` is included as a Render Blueprint.

1. Create a GitHub repository and upload the project files (exclude `node_modules/`, `dist/`, and `server/data/`).
2. Sign in to https://dashboard.render.com with your account.
3. Click **New → Blueprint**, choose the repository, and Render will read `render.yaml`.
4. Deploy. Render builds with `npm install --include=dev && npm run build` (dev dependencies are needed for Vite/Tailwind) and starts with `npm start`.
5. Your permanent URL will be `https://adearn.onrender.com` (or similar).

Notes:
- The app reads `PORT` from the environment, so it works on Render without changes.
- The free plan puts the service to sleep after inactivity; the first request after that may take a few seconds.
- The free plan has no persistent disk, so `server/data/db.json` resets on redeploy/restart. For durable data, add a paid persistent disk or switch to an external database (Postgres/MongoDB) and set its connection string as an environment variable.

## Notes for turning this into a real product

- Replace the `ADS` catalog with a real ad-network SDK/API (e.g. rewarded video ads) and verify impressions server-side.
- Add rate limiting, bot/fraud detection, and stricter session validation.
- Replace the JSON store with a database and use a real auth/session library.
- Integrate a payment provider with proper KYC, tax, and compliance handling.
