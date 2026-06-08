# Trackr Deployment Guide

## Quick Test with Family & Friends (No Domain Needed)

### Option A: Vercel (Recommended - Free, Automatic HTTPS Domain)

Vercel gives you a free `your-project.vercel.app` domain automatically. Here's how:

#### Step 1: Set Up Turso Cloud Database (Free Tier)

Since Vercel's serverless functions can't write to local SQLite, you need a cloud database.

1. Go to [turso.tech](https://turso.tech) → Sign up free
2. Create a new database:
   ```bash
   # Install Turso CLI
   curl -sSfL https://get.tur.so/install.sh | bash

   # Login
   turso auth login

   # Create database
   turso db create trackr-db

   # Get your database URL
   turso db show trackr-db --url
   # Example output: libsql://trackr-db-your-org.turso.io

   # Create an auth token
   turso db tokens create trackr-db
   ```
3. Get the **non-pooling URL** (for migrations):
   ```bash
   turso db show trackr-db --url
   # Add "?tls=true" at the end if not present
   ```

#### Step 2: Push Database Schema to Turso

```bash
# Set environment variables temporarily
export DATABASE_URL="libsql://trackr-db-your-org.turso.io"
export DATABASE_URL_NON_POOLING="libsql://trackr-db-your-org.turso.io"
export DATABASE_AUTH_TOKEN="your-token-here"

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push
```

#### Step 3: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Trackr - AI Voice Expense Tracker"
   git remote add origin https://github.com/your-username/trackr.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → Sign up with GitHub

3. Click **"New Project"** → Import your GitHub repo

4. Configure environment variables in Vercel dashboard:
   ```
   DATABASE_URL          = libsql://trackr-db-your-org.turso.io
   DATABASE_URL_NON_POOLING = libsql://trackr-db-your-org.turso.io
   DATABASE_AUTH_TOKEN   = your-turso-auth-token
   NEXTAUTH_SECRET       = some-random-secret-string-32-chars
   NEXTAUTH_URL          = https://your-project.vercel.app
   ```

5. Click **Deploy** — wait 2-3 minutes

6. Your app is live at `https://your-project.vercel.app` 🎉

#### (Optional) Set Up Google/Facebook OAuth

For social login, you need OAuth credentials:

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `https://your-project.vercel.app/api/auth/callback/google`
5. Add to Vercel env vars:
   ```
   GOOGLE_ID     = your-google-client-id
   GOOGLE_SECRET = your-google-client-secret
   ```

**Facebook OAuth:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create an app → Facebook Login
3. Add redirect URI: `https://your-project.vercel.app/api/auth/callback/facebook`
4. Add to Vercel env vars:
   ```
   FACEBOOK_ID     = your-facebook-app-id
   FACEBOOK_SECRET = your-facebook-app-secret
   ```

---

### Option B: Railway (Simpler - Persistent Filesystem)

Railway supports SQLite directly (no Turso needed), but free tier has a $5/month credit limit.

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **"New Project"** → Deploy from GitHub repo
3. Add environment variables:
   ```
   DATABASE_URL       = file:./db/custom.db
   NEXTAUTH_SECRET    = some-random-secret-string
   NEXTAUTH_URL       = https://your-project.up.railway.app
   ```
4. Railway auto-detects Next.js and deploys

---

### Option C: Quick Local Test with ngrok (Zero Deployment)

If you just want to share your local running app temporarily:

```bash
# Install ngrok
npm install -g ngrok

# Start your app
bun run dev

# In another terminal, expose it
ngrok http 3000
```

ngrok gives you a URL like `https://abc123.ngrok.io` — share this with family. The URL changes each time you restart ngrok (free tier).

---

## Architecture Overview

### Backend
- **18 API Routes**: Full CRUD for transactions, budgets, goals, lend/borrow, reminders, recurring transactions, accounts, export, AI categorization, analytics
- **Database**: Prisma ORM + SQLite (local) / Turso (cloud)
- **Authentication**: NextAuth with Google, Facebook, and name-based credentials
- **AI**: `z-ai-web-dev-sdk` for transaction parsing and budget suggestions

### AI Support
| Feature | AI Model | Fallback |
|---------|----------|----------|
| Voice/Text Transaction Parser | `z-ai-web-dev-sdk` chat completions | Regex-based parser |
| Budget Suggestions | `z-ai-web-dev-sdk` with 50/30/20 rule | Rule-based percentages |

### Landing Page
- Professional landing page with hero, features grid, voice demo, spending psychology section, testimonials, and integrated login
- Shows automatically for non-logged-in visitors

### Key Features
1. Voice input (English + Bangla)
2. AI categorization & classification
3. 22 currencies
4. Spending psychology insights
5. Financial goals & budgets
6. Lend/borrow tracker
7. Bill reminders with urgency
8. Photo receipts
9. CSV/PDF export
10. Dark mode & PWA
11. Recurring transactions

---

## Turso Free Tier Limits

- 9 GB storage
- 1 billion row reads/month
- 25 million row writes/month
- 3 databases
- 1 billion row reads/month

This is more than enough for family/friends testing and even production use.

## Vercel Free Tier Limits

- 100 GB bandwidth/month
- Serverless function execution: 10 seconds max
- 100 deployments/day
- Automatic HTTPS + `*.vercel.app` domain
