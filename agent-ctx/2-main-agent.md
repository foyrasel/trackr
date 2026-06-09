---
Task ID: 2
Agent: Main Agent
Task: Implement Account Setup, Transfers, Email Auth, Social Login

Work Log:
- Updated Prisma schema: added `emailVerified DateTime?` and `password String?` fields to User model
- Ran `bun run db:push` to apply schema changes
- Created AccountSetup.tsx: multi-step wizard (Cash → Banks → Wallets → Summary) with animated transitions
- Created TransferDialog.tsx: account-to-account transfer UI with From/To selectors, amount input, swap button
- Updated BalanceCards.tsx: added Transfer button between total balance and individual account cards
- Created /api/accounts/transfer/route.ts: POST endpoint for atomic balance transfers between accounts
- Created /api/auth/register/route.ts: POST endpoint for email signup with SHA-256 password hashing and verification code generation
- Created /api/auth/verify/route.ts: POST endpoint for email verification (6-digit code, accepts any valid code in demo mode)
- Updated LandingPage.tsx: added Quick Start / Email Sign Up tabs, verification code flow, social login buttons
- Updated NextAuth config: credentials provider now supports both name-based demo login and email+password login
- Updated page.tsx: added AccountSetup flow after onboarding, handleAccountSetupComplete saves accounts via API
- Updated lib/db.ts: added Turso migration for emailVerified column
- Fixed OnboardingScreen.tsx: reordered useCallback declarations to fix "accessed before declaration" error
- Removed unused `randomBytes` import from register route

Stage Summary:
- Account Setup Wizard: 4-step flow with Cash, Banks (presets like DBBL, BRAC, City Bank), Mobile Wallets (bKash, Nagad, Rocket), and Summary with total
- Transfer Feature: Dialog accessible from BalanceCards, handles credit card logic, validates sufficient balance
- Email Auth: Full signup → verification → login flow; verification code shown on screen for demo
- Social Login: Google/Facebook buttons appear when env vars are configured; OAuth users get emailVerified auto-set
- All changes pushed to GitHub: foyrasel/trackr main branch (commit 9f56db7)
