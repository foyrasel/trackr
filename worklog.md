# Trackr Worklog

---
Task ID: 1
Agent: Main
Task: Explore current project state

Work Log:
- Read all key files: page.tsx, Dashboard.tsx, VoiceInput.tsx, AddTransaction.tsx, TransactionConfirm.tsx, InsightsPanel.tsx, TransactionList.tsx
- Read API routes: analytics, transactions, ai/categorize
- Read prisma schema, package.json, .env, layout.tsx
- Confirmed project uses Next.js 16, Prisma, SQLite, next-auth (installed but unused)

Stage Summary:
- Project is at /home/z/my-project/
- next-auth is already installed but unused
- Zustand is installed but unused
- All components use mounted state guard for hydration safety
- Bangla voice recognition exists but needs improvement

---
Task ID: 2
Agent: Main
Task: Update Prisma schema with User, Account, Budget models

Work Log:
- Added User model (id, name, email, image, provider)
- Added Account model (id, userId, name, type, balance, color, icon, isDefault)
- Added Budget model (id, userId, month, category, amount, isIgnored)
- Updated Transaction model to add userId foreign key
- Ran prisma db push and prisma generate

Stage Summary:
- Database schema updated with 3 new models
- Account types: cash, debit, credit with color coding
- Budget supports isIgnored flag for skip/ignore feature
- Unique constraint on [userId, type] for accounts and [userId, month, category] for budgets

---
Task ID: 3
Agent: Main
Task: Add Google and Facebook login with NextAuth.js

Work Log:
- Created /api/auth/[...nextauth]/route.ts with Google, Facebook, and Credentials providers
- Added NEXTAUTH_SECRET and NEXTAUTH_URL to .env
- Created AuthProvider.tsx wrapper component
- Updated layout.tsx to wrap app with AuthProvider
- Login creates default accounts (Cash, Debit, Credit) for new users
- OAuth providers create/update users in DB on sign-in

Stage Summary:
- Google OAuth: requires GOOGLE_ID and GOOGLE_SECRET env vars
- Facebook OAuth: requires FACEBOOK_ID and FACEBOOK_SECRET env vars
- Demo login: name-only credentials provider for easy testing
- JWT session strategy with user ID in token

---
Task ID: 4
Agent: Main
Task: Add wallet balances and budget features

Work Log:
- Created /api/accounts/route.ts (GET, POST, PUT)
- Created /api/budgets/route.ts (GET, POST, PUT, DELETE)
- Created /api/budgets/suggest/route.ts (AI-powered budget suggestions)
- Updated /api/transactions/route.ts to update account balance on create
- Updated /api/transactions/[id]/route.ts to reverse balance on delete
- Created BalanceCards.tsx component with adjust dialog
- Created BudgetPanel.tsx component with AI suggestions
- Created LoginScreen.tsx with Google/Facebook/Demo login

Stage Summary:
- Cash: expense deducts from balance, income adds
- Debit Card: expense deducts from balance, income adds
- Credit Card: expense ADDS to balance (more debt), income subtracts
- Balance adjustment dialog with add/deduct options
- AI budget suggestions using z-ai-web-dev-sdk
- Budget can be ignored/skipped with eye icon

---
Task ID: 5
Agent: Main
Task: Improve Bangla voice recognition and update main page

Work Log:
- Updated VoiceInput.tsx with:
  - Multiple language fallback codes (bn-IN, bn-BD)
  - maxAlternatives=5 for better Bangla recognition
  - Auto-stop countdown with visual indicator
  - Confidence meter showing recognition quality
  - Better error messages with Bangla tips
  - Automatic restart on no-speech for Bangla mode
  - Interim results display
- Updated Dashboard.tsx to include BalanceCards component
- Updated page.tsx with:
  - Login/logout flow
  - 5-tab navigation (Dashboard, Budget, Add, History, Insights)
  - User name display in header
  - localStorage session persistence

Stage Summary:
- VoiceInput now has better Bangla handling with fallback codes, more alternatives, auto-restart
- Dashboard shows balance cards at top
- Budget is a new tab in navigation
- Login persists via localStorage

---
Task ID: 6
Agent: Main
Task: Fix bugs, verify end-to-end flow, and finalize

Work Log:
- Fixed Progress import in BudgetPanel (was from @/components/ui/bar, now @/components/ui/progress)
- Fixed lint error: setState in useEffect (page.tsx login state) - used requestAnimationFrame
- Added setLoading(true) before fetchAnalytics in Dashboard for proper refresh
- Added setLoading(true) before fetchAccounts in BalanceCards for proper refresh
- Added type="button" to Confirm/Cancel buttons in TransactionConfirm
- Improved handleTransactionAdded timing: navigate first, then refresh with delay
- Verified all API endpoints work correctly with curl tests
- Verified balance deduction logic: Cash/Debit subtract, Credit Card adds (debt)
- Verified balance reversal on delete: works correctly
- Browser verified all 5 tabs: Dashboard, Budget, Add, History, Insights
- Browser verified login flow, AI categorization, transaction confirmation

Stage Summary:
- All features working: Login, Balances, Budget, Transactions, Insights
- Lint passes clean
- No runtime errors in dev log
- All API endpoints returning 200/201

---
Task ID: 7
Agent: Main
Task: Add month name, average vs current line chart, yearly average comparison, improve Bangla voice

Work Log:
- Added month name display with navigation (prev/next month) to Dashboard header as a prominent green card
- Updated analytics API to return: monthName, monthShortName, avgVsCurrentLineData (cumulative daily), yearlyComparison, allTimeAvgMonthlyExpense
- Built Average vs Current Month LINE chart (matching user's hand-drawn picture):
  - X-axis: Date of Month (1, 5, 10, 15, 20, 25, 30)
  - Y-axis: Expense (cumulative)
  - Solid green line for Current Month
  - Dashed gray line for Average Monthly Habit
  - Interactive tooltips, summary cards below chart
- Added Yearly Average Comparison section with two views:
  - Overview: All-time average card + year-by-year cards with avg monthly, total expense, total income, % change from previous year
  - Yearly Chart: Bar chart comparing avg monthly expense across years
- Improved Bangla voice recognition:
  - Changed primary code from bn-IN to bn-BD (Bangladesh locale)
  - Increased maxAlternatives from 5 to 8 for Bangla
  - Added smart alternative selection (prioritizes results with digits/financial keywords)
  - Added Bangla post-processing: misrecognition fixes (টগা→টাকা, খরজ→খরচ), Bangla digit conversion
  - Increased auto-stop countdown from 15s to 20s for Bangla
  - Increased max restart attempts from 3 to 5 for Bangla
  - Added language-unavailable error handler with fallback
  - Shows active language code during recording
  - Added more Bangla voice tips

Stage Summary:
- Month name prominently displayed with prev/next navigation
- Average vs Current Month line chart replaces the old bar chart - matches user's sketch
- Yearly comparison shows current year, previous year, and all-time averages
- Bangla voice recognition improved with better locale, more alternatives, smart selection, post-processing
- Build passes clean

---
Task ID: 8
Agent: Main
Task: Make TransactionConfirm auto-editable, add date field with voice date parsing

Work Log:
- Removed Edit/Done button from TransactionConfirm - all fields are now always editable
- Added Date field to TransactionConfirm with date input picker (max=today)
- Shows "Past Date" badge and "Previous expenditure" label when date differs from today
- Added Type toggle (Expense/Income) buttons directly on the confirmation card
- Updated CategorizedTransaction interface to include `date: string`
- Updated AI categorize route (`/api/ai/categorize`) with comprehensive date extraction:
  - English: "yesterday", "N days ago", "last Friday/Monday", specific dates "5 June"
  - Bangla: "গতকাল" (yesterday), "N দিন আগে" (N days ago), "গত শুক্রবার" (last Friday), "5 জুন"
  - DD/MM/YYYY and DD-MM-YYYY format support
  - AI prompt updated to extract date from voice input
  - Regex fallback (extractDateFromText) when AI unavailable
  - Future dates rejected, defaults to today if no date mentioned
- Updated AddTransaction with date-aware example phrases:
  - Bangla: "গতকাল রিকশায় ১০০ টাকা", "গত শুক্রবার বাজারে ২০০০ টাকা"
  - English: "Paid 15000 rent from debit yesterday", "Last Friday 500 taka on coffee"
- Added hints: "তারিখ বললে সেটা অটোমেটিক সেট হবে" / "Mention date 'yesterday', 'last Friday' — it will be auto-set"
- Toast notification shows date for past transactions
- Tested all date extraction: "yesterday" → 2026-06-07, "গতকাল" → 2026-06-07, "last Friday" → 2026-06-05, no date → today

Stage Summary:
- All fields auto-editable, no need to click edit button
- Date field with picker always visible and editable
- Voice date parsing works for English and Bangla
- "yesterday", "গতকাল", "last Friday", "গত শুক্রবার" all auto-set the date
- No date mentioned = today's date (correct default)
- Build passes clean
