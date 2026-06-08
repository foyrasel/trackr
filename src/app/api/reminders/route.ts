import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Calculate the next due date for a recurring reminder based on frequency.
 */
function getNextDueDate(currentDueDate: Date, frequency: string): Date {
  const next = new Date(currentDueDate)
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      // Default to monthly if frequency is unrecognized
      next.setMonth(next.getMonth() + 1)
  }
  return next
}

/**
 * Auto-create next recurring reminder if a recurring one is marked paid.
 * Called during GET to ensure recurring reminders keep generating.
 */
async function handleRecurringReminders(userId: string) {
  // Find recurring reminders that are paid but haven't spawned a next reminder yet
  const paidRecurring = await db.reminder.findMany({
    where: {
      userId,
      isRecurring: true,
      isPaid: true,
      frequency: { not: null },
    },
  })

  for (const reminder of paidRecurring) {
    // Check if a next reminder already exists for the next period
    // We look for a non-paid reminder with the same title, category, and frequency
    const nextDueDate = getNextDueDate(reminder.dueDate, reminder.frequency!)

    const existingNext = await db.reminder.findFirst({
      where: {
        userId,
        title: reminder.title,
        category: reminder.category,
        isRecurring: true,
        frequency: reminder.frequency,
        isPaid: false,
        dueDate: {
          // Look for a reminder due within 1 day of the calculated next date
          gte: new Date(nextDueDate.getTime() - 86400000),
          lte: new Date(nextDueDate.getTime() + 86400000),
        },
      },
    })

    if (!existingNext) {
      await db.reminder.create({
        data: {
          userId,
          title: reminder.title,
          amount: reminder.amount,
          category: reminder.category,
          dueDate: nextDueDate,
          remindDays: reminder.remindDays,
          isRecurring: true,
          frequency: reminder.frequency,
          isPaid: false,
          isDismissed: false,
        },
      })
    }
  }
}

// GET /api/reminders - List all reminders for user with computed fields
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Auto-create next recurring reminders for paid recurring ones
    await handleRecurringReminders(user.id)

    const reminders = await db.reminder.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: 'asc' },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const enrichedReminders = reminders.map((reminder) => {
      const dueDate = new Date(reminder.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      const remindDate = new Date(dueDate)
      remindDate.setDate(remindDate.getDate() - reminder.remindDays)

      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      const isDue = !reminder.isPaid && remindDate <= today

      return {
        ...reminder,
        isDue,
        daysUntilDue,
      }
    })

    return NextResponse.json({ reminders: enrichedReminders })
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

// POST /api/reminders - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, amount, category, dueDate, remindDays, isRecurring, frequency } = body

    if (!title || !dueDate) {
      return NextResponse.json(
        { error: 'Title and dueDate are required' },
        { status: 400 }
      )
    }

    const reminder = await db.reminder.create({
      data: {
        userId: user.id,
        title,
        amount: amount !== undefined ? parseFloat(String(amount)) : null,
        category: category || 'Utilities',
        dueDate: new Date(dueDate),
        remindDays: remindDays ?? 3,
        isRecurring: isRecurring ?? false,
        frequency: frequency || null,
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDateObj = new Date(reminder.dueDate)
    dueDateObj.setHours(0, 0, 0, 0)
    const remindDate = new Date(dueDateObj)
    remindDate.setDate(remindDate.getDate() - reminder.remindDays)
    const daysUntilDue = Math.ceil(
      (dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      reminder: {
        ...reminder,
        isDue: !reminder.isPaid && remindDate <= today,
        daysUntilDue,
      },
    })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 })
  }
}

// PUT /api/reminders - Update a reminder
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      id,
      title,
      amount,
      category,
      dueDate,
      remindDays,
      isRecurring,
      frequency,
      isPaid,
      isDismissed,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.reminder.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    const reminder = await db.reminder.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(amount !== undefined && { amount: amount !== null ? parseFloat(String(amount)) : null }),
        ...(category !== undefined && { category }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(remindDays !== undefined && { remindDays }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(frequency !== undefined && { frequency: frequency || null }),
        ...(isPaid !== undefined && { isPaid }),
        ...(isDismissed !== undefined && { isDismissed }),
      },
    })

    // If marking as paid and recurring, auto-create the next reminder
    if (isPaid === true && existing.isRecurring && existing.frequency) {
      const nextDueDate = getNextDueDate(reminder.dueDate, existing.frequency)

      // Check if next reminder already exists
      const existingNext = await db.reminder.findFirst({
        where: {
          userId: user.id,
          title: reminder.title,
          category: reminder.category,
          isRecurring: true,
          frequency: existing.frequency,
          isPaid: false,
          dueDate: {
            gte: new Date(nextDueDate.getTime() - 86400000),
            lte: new Date(nextDueDate.getTime() + 86400000),
          },
        },
      })

      if (!existingNext) {
        await db.reminder.create({
          data: {
            userId: user.id,
            title: reminder.title,
            amount: reminder.amount,
            category: reminder.category,
            dueDate: nextDueDate,
            remindDays: reminder.remindDays,
            isRecurring: true,
            frequency: existing.frequency,
            isPaid: false,
            isDismissed: false,
          },
        })
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDateObj = new Date(reminder.dueDate)
    dueDateObj.setHours(0, 0, 0, 0)
    const remindDate = new Date(dueDateObj)
    remindDate.setDate(remindDate.getDate() - reminder.remindDays)
    const daysUntilDue = Math.ceil(
      (dueDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    return NextResponse.json({
      reminder: {
        ...reminder,
        isDue: !reminder.isPaid && remindDate <= today,
        daysUntilDue,
      },
    })
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 })
  }
}

// DELETE /api/reminders - Delete a reminder by id
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reminderId = searchParams.get('id')

    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.reminder.findUnique({ where: { id: reminderId } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    await db.reminder.delete({ where: { id: reminderId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 })
  }
}
