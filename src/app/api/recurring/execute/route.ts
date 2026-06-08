import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processDueRecurringTransactions } from '@/lib/recurring-utils'

/**
 * GET /api/recurring/execute
 *
 * Check for due recurring transactions and create the actual transactions.
 * A recurring transaction is "due" if:
 *   - isActive is true
 *   - lastExecuted is null OR the next execution date based on frequency has passed
 *   - startDate <= today
 *   - endDate is null OR endDate >= today
 *
 * For each due recurring transaction:
 *   - Create a new Transaction record
 *   - Update lastExecuted to today
 *
 * Returns the count of executed transactions.
 * This endpoint is idempotent — safe to call multiple times.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process all due recurring transactions for this user
    const createdCount = await processDueRecurringTransactions(user.id)

    return NextResponse.json({
      success: true,
      executedCount: createdCount,
      message: createdCount > 0
        ? `Executed ${createdCount} recurring transaction${createdCount > 1 ? 's' : ''}`
        : 'No recurring transactions due',
    })
  } catch (error) {
    console.error('Error executing recurring transactions:', error)
    return NextResponse.json(
      { error: 'Failed to execute recurring transactions' },
      { status: 500 }
    )
  }
}
