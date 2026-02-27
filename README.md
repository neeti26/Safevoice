# SafeVoice - POSH-Compliant Anonymous Reporting Bot

SafeVoice is a comprehensive, secure, and fully anonymous Telegram bot designed for reporting workplace harassment and evaluating cases in compliance with the **POSH (Prevention of Sexual Harassment) Act**. 

## ✨ Features

- **4-Button Main Menu:** Intuitive access to the bot's core features.
- **7-Step POSH Compass:** Guided evaluation to help users understand if their situation falls under POSH guidelines.
- **10-Step Complaint Filing Flow (Hinglish):** An accessible, step-by-step reporting mechanism natively designed in Hinglish.
- **LCC Integration:** Streamlined mechanism for reporting effectively to the Local Complaints Committee.
- **Total Anonymity:** Uses cryptography & secure workflows (including `bip39` mnemonics) to assure user anonymity.
- **Persistent Data & Sessions:** Real-time state management using Redis combined with strong relational schemas via PostgreSQL.

## 🛠 Tech Stack

- **Node.js**: Backend Environment
- **Telegraf**: Telegram Bot Framework
- **PostgreSQL**: Primary Database
- **Redis**: Session management and fast temporary states
- **Crypto-js & bip39**: Securing identities and anonymous complaint filings

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- Node.js (v18 or higher)
- PostgreSQL
- Redis Server
- A Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/neeti26/Safevoice.git
   cd Safevoice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and configure the environment:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   DATABASE_URL=postgres://username:password@localhost:5432/safedb
   REDIS_URL=redis://127.0.0.0:6379
   ENCRYPTION_KEY=super_secret_encryption_key
   PORT=3000
   ```
   *(Adjust keys as per your specific `.env` setup)*

### Running the Bot

**Development Mode** (with auto-reloading using `nodemon`):
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

## 📂 Project Structure

```text
├── src/
│   ├── bot.js         # Telegraf bot setup and core command handlers
│   ├── index.js       # Express server and application entry point
│   ├── db.js          # PostgreSQL database connection and queries
│   ├── redis.js       # Redis client and session management
│   ├── crypto.js      # Utility functions for encryption/decryption
│   ├── routes/        # Express API routes (e.g., webhook handling)
│   └── lib/           # Core logic, POSH compass flows, and utilities
├── Complaints_Database.csv  # Auto-generated CSV logs (if applicable)
├── package.json       # Dependencies and npm scripts
└── .env               # Environment configurations
```

---
*Empowering individuals with a safe, anonymous voice against workplace harassment.*
