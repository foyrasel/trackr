---
Task ID: 1
Agent: Super Z (main)
Task: Fix Google/Facebook login, add auth/user isolation, add transaction editing, add pagination

Work Log:
- Updated LoginScreen.tsx: Google/Facebook buttons now call next-auth signIn() instead of setTimeout simulation
- Demo login uses next-auth credentials provider with proper session creation
- Created /src/lib/auth.ts: Auth helper utility with getCurrentUser() for API routes
- Updated all API routes (accounts, transactions, transactions/[id], analytics, budgets, budgets/suggest) to:
  - Use getCurrentUser() for authentication
  - Filter all queries by user.id for data isolation
  - Verify ownership before update/delete operations
  - Return 401 for unauthorized requests
- Updated all frontend components (Dashboard, BalanceCards, AddTransaction, TransactionList, InsightsPanel, BudgetPanel) to:
  - Accept userName prop from page.tsx
  - Pass x-user-name header with all API fetch calls
- Updated page.tsx to:
  - Use next-auth useSession() for session detection
  - Pass userName prop to all child components
  - Handle logout with next-auth signOut()
- Added transaction editing UI: Edit dialog with all fields (type, amount, date, description, category, payment method, classification)
- Added pagination with "Load More" button in TransactionList (30 items per page)
- Updated transactions/[id] PUT route to properly handle balance adjustments on edit
- Build passes successfully

Stage Summary:
- Google/Facebook login now uses real next-auth OAuth (requires env vars for production)
- Demo login creates proper next-auth session via credentials provider
- All API routes are now user-isolated - no more db.user.findFirst() fallback
- Transaction editing is fully functional with balance adjustment logic
- Pagination added with Load More button
- Build compiles without errors
