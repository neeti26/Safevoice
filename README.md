# Anonymous POSH-Compliant Telegram Bot

Complete Telegram chatbot for ICC/LCC dashboard in a POSH-compliant anonymous workplace harassment reporting system. Designed for India's POSH Act 2013.

## Features
- **Anonymous Reporting**: Collects information without Telegram User IDs. 12-word BIP39 passphrase used for tracking.
- **Privacy First**: Details encrypted (AES-256), identifying data (designation, dept) and evidence are heavily hashed (SHA-256).
- **Compliance Rules**: Incorporates Sec 11 (Inquiry bounds), Sec 9 (Delay reasoning for >3mo cases), and 90-day/7-day SLA alerts.
- **Role-Based Access**: Strict isolation of `/admin` commands using `ICC_ADMINS` ID list.
- **Auto-escalation & Pattern Matching**: Notifies ICC specific groups on new cases and detects repeat offenders by checking `COUNT(accused_hash) > 2`.

## Tech Stack
- NodeJS, Express, Telegraf.js
- PostgreSQL (Database)
- Redis (Session + SLA Timers)
- Crypto-js & Bip39

## Local Setup
1. `npm install`
2. Create PostgreSQL database and run `schema.sql`.
3. Start Redis Server locally.
4. Copy `.env.example` to `.env` and fill values (Create a bot via @BotFather to get `BOT_TOKEN`).
5. Set `ICC_ADMINS` to your telegram user ID (talk to @userinfobot to find yours).
6. Run `npm run dev`.
7. Talk to your bot using `/start`.

## Deployment (Vercel)
1. Add `BOT_TOKEN`, `DB_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, `ICC_ADMINS`, and `ICC_GROUP_ID` to your Vercel Environment Variables.
2. Set `NODE_ENV` to `production`.
3. Point Vercel build to start your Express app (`src/index.js`).
4. Add `WEBHOOK_URL` in env to point to your Vercel domain (e.g. `https://your-app.vercel.app`).
5. Start app; Webhooks will be configured automatically.
