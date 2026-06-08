# Task 2-b: Goals API and Reminders API Routes

## Summary
Created two API route files for the expense tracker app:

### Files Created
1. **`/src/app/api/goals/route.ts`** — Full CRUD for savings goals
   - GET: List goals with computed `progressPercent` (capped at 100)
   - POST: Create goal (name + targetAmount required), auto-set isCompleted
   - PUT: Update goal, verify ownership, auto-set isCompleted when savedAmount >= targetAmount
   - DELETE: Delete goal, verify ownership

2. **`/src/app/api/reminders/route.ts`** — Full CRUD for bill/payment reminders
   - GET: List reminders with computed `isDue` and `daysUntilDue`, auto-create next recurring reminder for paid recurring items
   - POST: Create reminder (title + dueDate required)
   - PUT: Update reminder, verify ownership, auto-create next recurring reminder on isPaid
   - DELETE: Delete reminder, verify ownership

### Key Implementation Details
- Both APIs use `getCurrentUser(request)` from `@/lib/auth` for auth (401 on unauthorized)
- Ownership verification on all PUT/DELETE operations
- `progressPercent` computed as `(savedAmount/targetAmount * 100)`, capped at 100
- `isDue` computed as: `!isPaid && (dueDate - remindDays days) <= today`
- `daysUntilDue` computed as: days difference between dueDate and today
- Recurring reminder auto-creation: when a recurring reminder is paid, next one is spawned based on frequency (daily/weekly/monthly/yearly)
- Lint passes with no errors on new files
