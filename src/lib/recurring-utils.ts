import { db } from '@/lib/db'

/**
 * Calculate the next execution date for a recurring transaction
 * based on its frequency, dayOfMonth, dayOfWeek, startDate, and lastExecuted.
 */
export function getNextExecutionDate(recurring: {
  frequency: string
  dayOfMonth: number
  dayOfWeek: number | null
  startDate: Date
  endDate: Date | null
  lastExecuted: Date | null
}): Date | null {
  const now = new Date()

  // If past end date, no more executions
  if (recurring.endDate && new Date(recurring.endDate) < now) {
    return null
  }

  // Start from the last executed date or the start date
  const referenceDate = recurring.lastExecuted
    ? new Date(recurring.lastExecuted)
    : new Date(recurring.startDate)

  let nextDate: Date

  switch (recurring.frequency) {
    case 'daily': {
      // Next day after lastExecuted; if never executed, start from startDate
      nextDate = new Date(referenceDate)
      nextDate.setDate(nextDate.getDate() + 1)
      // If startDate is in the future, next execution is startDate
      if (new Date(recurring.startDate) > now) {
        nextDate = new Date(recurring.startDate)
      }
      break
    }

    case 'weekly': {
      const targetDay = recurring.dayOfWeek ?? 0 // Default to Sunday
      nextDate = new Date(referenceDate)
      nextDate.setDate(nextDate.getDate() + 1) // Move forward at least one day

      // Find the next occurrence of the target day of week
      const currentDay = nextDate.getDay()
      const daysUntilTarget = (targetDay - currentDay + 7) % 7
      nextDate.setDate(nextDate.getDate() + daysUntilTarget)

      // If startDate is in the future, find first target day on or after startDate
      if (new Date(recurring.startDate) > now) {
        nextDate = new Date(recurring.startDate)
        const startDay = nextDate.getDay()
        const daysUntil = (targetDay - startDay + 7) % 7
        nextDate.setDate(nextDate.getDate() + daysUntil)
      }
      break
    }

    case 'monthly': {
      nextDate = new Date(referenceDate)
      nextDate.setMonth(nextDate.getMonth() + 1)
      // Set to the target day of month, clamping to last day of month
      const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
      nextDate.setDate(Math.min(recurring.dayOfMonth, maxDay))

      // If startDate is in the future, start from the first occurrence on/after startDate
      if (new Date(recurring.startDate) > now) {
        nextDate = new Date(recurring.startDate.getFullYear(), recurring.startDate.getMonth(), Math.min(recurring.dayOfMonth, maxDay))
        if (nextDate < new Date(recurring.startDate)) {
          nextDate.setMonth(nextDate.getMonth() + 1)
          const maxDay2 = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
          nextDate.setDate(Math.min(recurring.dayOfMonth, maxDay2))
        }
      }
      break
    }

    case 'yearly': {
      nextDate = new Date(referenceDate)
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      // Set to the target day of month in the same month as startDate
      const startMonth = new Date(recurring.startDate).getMonth()
      nextDate.setMonth(startMonth)
      const maxDay3 = new Date(nextDate.getFullYear(), startMonth + 1, 0).getDate()
      nextDate.setDate(Math.min(recurring.dayOfMonth, maxDay3))

      // If startDate is in the future, first occurrence is on startDate's month/day
      if (new Date(recurring.startDate) > now) {
        nextDate = new Date(recurring.startDate.getFullYear(), startMonth, Math.min(recurring.dayOfMonth, maxDay3))
        if (nextDate < new Date(recurring.startDate)) {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          const maxDay4 = new Date(nextDate.getFullYear(), startMonth + 1, 0).getDate()
          nextDate.setDate(Math.min(recurring.dayOfMonth, maxDay4))
        }
      }
      break
    }

    default:
      return null
  }

  // Normalize both dates to date-only comparison (midnight)
  const nextDateOnly = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate())
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // If next execution is still in the future, it's not due yet
  if (nextDateOnly > nowOnly) {
    return nextDate
  }

  // It's due — but we need to handle multiple missed executions
  // Keep advancing until we find a date that's in the future or today
  while (nextDateOnly <= nowOnly) {
    advanceDate(nextDate, recurring.frequency, recurring.dayOfMonth, recurring.dayOfWeek)
    nextDateOnly.setFullYear(nextDate.getFullYear())
    nextDateOnly.setMonth(nextDate.getMonth())
    nextDateOnly.setDate(nextDate.getDate())
  }

  // Return the first due date (which may be today or in the past)
  // Actually we need to return the computed next, but we also need to know if it's due
  // Let's recalculate: the first next date that was <= now is the due one
  return nextDate
}

/**
 * Check if a recurring transaction is currently due for execution.
 * Returns the execution date if due, null otherwise.
 */
export function getDueExecutionDate(recurring: {
  frequency: string
  dayOfMonth: number
  dayOfWeek: number | null
  startDate: Date
  endDate: Date | null
  lastExecuted: Date | null
}): Date | null {
  const now = new Date()
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // If not yet started, not due
  if (new Date(recurring.startDate) > now) {
    return null
  }

  // If past end date, not due
  if (recurring.endDate && new Date(recurring.endDate) < now) {
    return null
  }

  // Calculate the next execution date from reference point
  const referenceDate = recurring.lastExecuted
    ? new Date(recurring.lastExecuted)
    : new Date(recurring.startDate)

  let candidateDate: Date

  switch (recurring.frequency) {
    case 'daily': {
      if (!recurring.lastExecuted) {
        // Never executed — first execution is on startDate
        candidateDate = new Date(recurring.startDate)
      } else {
        // Next day after last executed
        candidateDate = new Date(referenceDate)
        candidateDate.setDate(candidateDate.getDate() + 1)
      }
      break
    }

    case 'weekly': {
      const targetDay = recurring.dayOfWeek ?? 0
      if (!recurring.lastExecuted) {
        // First occurrence of target day on or after startDate
        candidateDate = new Date(recurring.startDate)
        const startDay = candidateDate.getDay()
        const daysUntil = (targetDay - startDay + 7) % 7
        candidateDate.setDate(candidateDate.getDate() + daysUntil)
      } else {
        // Next occurrence of target day after last executed
        candidateDate = new Date(referenceDate)
        candidateDate.setDate(candidateDate.getDate() + 1)
        const currentDay = candidateDate.getDay()
        const daysUntil = (targetDay - currentDay + 7) % 7
        candidateDate.setDate(candidateDate.getDate() + daysUntil)
      }
      break
    }

    case 'monthly': {
      const day = recurring.dayOfMonth
      if (!recurring.lastExecuted) {
        // First occurrence of dayOfMonth on or after startDate
        const start = new Date(recurring.startDate)
        const maxDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
        candidateDate = new Date(start.getFullYear(), start.getMonth(), Math.min(day, maxDay))
        if (candidateDate < start) {
          // Move to next month
          candidateDate.setMonth(candidateDate.getMonth() + 1)
          const maxDay2 = new Date(candidateDate.getFullYear(), candidateDate.getMonth() + 1, 0).getDate()
          candidateDate.setDate(Math.min(day, maxDay2))
        }
      } else {
        // Next month after last executed
        candidateDate = new Date(referenceDate)
        candidateDate.setMonth(candidateDate.getMonth() + 1)
        const maxDay = new Date(candidateDate.getFullYear(), candidateDate.getMonth() + 1, 0).getDate()
        candidateDate.setDate(Math.min(day, maxDay))
      }
      break
    }

    case 'yearly': {
      const day = recurring.dayOfMonth
      const startMonth = new Date(recurring.startDate).getMonth()
      if (!recurring.lastExecuted) {
        const start = new Date(recurring.startDate)
        const maxDay = new Date(start.getFullYear(), startMonth + 1, 0).getDate()
        candidateDate = new Date(start.getFullYear(), startMonth, Math.min(day, maxDay))
        if (candidateDate < start) {
          candidateDate.setFullYear(candidateDate.getFullYear() + 1)
          const maxDay2 = new Date(candidateDate.getFullYear(), startMonth + 1, 0).getDate()
          candidateDate.setDate(Math.min(day, maxDay2))
        }
      } else {
        candidateDate = new Date(referenceDate)
        candidateDate.setFullYear(candidateDate.getFullYear() + 1)
        const maxDay = new Date(candidateDate.getFullYear(), startMonth + 1, 0).getDate()
        candidateDate.setDate(Math.min(day, maxDay))
      }
      break
    }

    default:
      return null
  }

  // Check if candidate date is today or in the past (due)
  const candidateOnly = new Date(candidateDate.getFullYear(), candidateDate.getMonth(), candidateDate.getDate())
  if (candidateOnly <= nowOnly) {
    return candidateDate
  }

  return null
}

/**
 * Advance a date by one period based on frequency.
 */
function advanceDate(date: Date, frequency: string, dayOfMonth: number, _dayOfWeek: number | null): void {
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1)
      break
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'monthly': {
      date.setMonth(date.getMonth() + 1)
      const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(dayOfMonth, maxDay))
      break
    }
    case 'yearly': {
      date.setFullYear(date.getFullYear() + 1)
      const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(dayOfMonth, maxDay))
      break
    }
  }
}

/**
 * Compute the next execution date for display purposes.
 * This returns the upcoming execution date (which may be today if due).
 */
export function computeNextExecutionDate(recurring: {
  frequency: string
  dayOfMonth: number
  dayOfWeek: number | null
  startDate: Date
  endDate: Date | null
  lastExecuted: Date | null
}): Date | null {
  const now = new Date()

  // If past end date, no more executions
  if (recurring.endDate && new Date(recurring.endDate) < now) {
    return null
  }

  // If not yet started
  if (new Date(recurring.startDate) > now) {
    // Return the first execution date
    return getDueExecutionDate(recurring) || new Date(recurring.startDate)
  }

  const referenceDate = recurring.lastExecuted
    ? new Date(recurring.lastExecuted)
    : new Date(recurring.startDate)

  let nextDate: Date

  switch (recurring.frequency) {
    case 'daily': {
      if (!recurring.lastExecuted) {
        nextDate = new Date(recurring.startDate)
      } else {
        nextDate = new Date(referenceDate)
        nextDate.setDate(nextDate.getDate() + 1)
      }
      break
    }

    case 'weekly': {
      const targetDay = recurring.dayOfWeek ?? 0
      if (!recurring.lastExecuted) {
        nextDate = new Date(recurring.startDate)
        const startDay = nextDate.getDay()
        const daysUntil = (targetDay - startDay + 7) % 7
        nextDate.setDate(nextDate.getDate() + daysUntil)
      } else {
        nextDate = new Date(referenceDate)
        nextDate.setDate(nextDate.getDate() + 1)
        const currentDay = nextDate.getDay()
        const daysUntil = (targetDay - currentDay + 7) % 7
        nextDate.setDate(nextDate.getDate() + daysUntil)
      }
      break
    }

    case 'monthly': {
      const day = recurring.dayOfMonth
      if (!recurring.lastExecuted) {
        const start = new Date(recurring.startDate)
        const maxDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
        nextDate = new Date(start.getFullYear(), start.getMonth(), Math.min(day, maxDay))
        if (nextDate < start) {
          nextDate.setMonth(nextDate.getMonth() + 1)
          const maxDay2 = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
          nextDate.setDate(Math.min(day, maxDay2))
        }
      } else {
        nextDate = new Date(referenceDate)
        nextDate.setMonth(nextDate.getMonth() + 1)
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
        nextDate.setDate(Math.min(day, maxDay))
      }
      break
    }

    case 'yearly': {
      const day = recurring.dayOfMonth
      const startMonth = new Date(recurring.startDate).getMonth()
      if (!recurring.lastExecuted) {
        const start = new Date(recurring.startDate)
        const maxDay = new Date(start.getFullYear(), startMonth + 1, 0).getDate()
        nextDate = new Date(start.getFullYear(), startMonth, Math.min(day, maxDay))
        if (nextDate < start) {
          nextDate.setFullYear(nextDate.getFullYear() + 1)
          const maxDay2 = new Date(nextDate.getFullYear(), startMonth + 1, 0).getDate()
          nextDate.setDate(Math.min(day, maxDay2))
        }
      } else {
        nextDate = new Date(referenceDate)
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        const maxDay = new Date(nextDate.getFullYear(), startMonth + 1, 0).getDate()
        nextDate.setDate(Math.min(day, maxDay))
      }
      break
    }

    default:
      return null
  }

  // If endDate is set and nextDate exceeds it, no more executions
  if (recurring.endDate && nextDate > new Date(recurring.endDate)) {
    return null
  }

  return nextDate
}

/**
 * Process all due recurring transactions for a given user.
 * Creates transactions for each due recurring and updates lastExecuted.
 * Returns the number of transactions created.
 */
export async function processDueRecurringTransactions(userId: string): Promise<number> {
  const now = new Date()
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Get all active recurring transactions for this user
  const recurringTxns = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: now },
    },
  })

  let created = 0

  for (const recurring of recurringTxns) {
    // Check if past end date
    if (recurring.endDate && new Date(recurring.endDate) < now) {
      continue
    }

    // Find all due execution dates (could be multiple if missed)
    const dueDates: Date[] = []
    let currentDate = getDueExecutionDate(recurring)

    // We limit to prevent infinite loops — max 12 missed executions
    let safetyCounter = 0
    while (currentDate && safetyCounter < 12) {
      const currentOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
      if (currentOnly <= nowOnly) {
        dueDates.push(currentDate)
        // Advance to find next potential due date
        const nextRef = new Date(currentDate)
        const updatedRecurring = {
          ...recurring,
          lastExecuted: nextRef,
        }
        currentDate = getDueExecutionDate(updatedRecurring)
        safetyCounter++
      } else {
        break
      }
    }

    // Create a transaction for each due date
    for (const dueDate of dueDates) {
      await db.transaction.create({
        data: {
          userId,
          type: recurring.type,
          amount: recurring.amount,
          description: recurring.description,
          category: recurring.category,
          spendingType: recurring.spendingType,
          classification: recurring.classification,
          date: dueDate,
          isRecurring: true,
          recurringId: recurring.id,
        },
      })

      // Update account balance
      const account = await db.account.findFirst({
        where: { userId, type: recurring.spendingType },
      })
      if (account) {
        if (recurring.type === 'expense') {
          const newBalance = recurring.spendingType === 'credit'
            ? account.balance + recurring.amount
            : account.balance - recurring.amount
          await db.account.update({
            where: { id: account.id },
            data: { balance: newBalance },
          })
        } else if (recurring.type === 'income') {
          await db.account.update({
            where: { id: account.id },
            data: { balance: account.balance + recurring.amount },
          })
        }
      }

      created++
    }

    // Update lastExecuted to the most recent due date
    if (dueDates.length > 0) {
      const lastDueDate = dueDates[dueDates.length - 1]
      await db.recurringTransaction.update({
        where: { id: recurring.id },
        data: { lastExecuted: lastDueDate },
      })
    }
  }

  return created
}
