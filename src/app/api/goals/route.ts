import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/goals - List all goals for user with computed progressPercent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goals = await db.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const enrichedGoals = goals.map((goal) => ({
      ...goal,
      progressPercent: Math.min(
        Math.round((goal.savedAmount / goal.targetAmount) * 100),
        100
      ),
    }))

    return NextResponse.json({ goals: enrichedGoals })
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, targetAmount, savedAmount, deadline, icon, color } = body

    if (!name || targetAmount === undefined || targetAmount === null) {
      return NextResponse.json(
        { error: 'Name and targetAmount are required' },
        { status: 400 }
      )
    }

    const goal = await db.goal.create({
      data: {
        userId: user.id,
        name,
        targetAmount: parseFloat(String(targetAmount)),
        savedAmount: savedAmount !== undefined ? parseFloat(String(savedAmount)) : 0,
        deadline: deadline ? new Date(deadline) : null,
        icon: icon || '🎯',
        color: color || '#10b981',
        isCompleted:
          savedAmount !== undefined
            ? parseFloat(String(savedAmount)) >= parseFloat(String(targetAmount))
            : false,
      },
    })

    return NextResponse.json({
      goal: {
        ...goal,
        progressPercent: Math.min(
          Math.round((goal.savedAmount / goal.targetAmount) * 100),
          100
        ),
      },
    })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

// PUT /api/goals - Update a goal
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, targetAmount, savedAmount, deadline, icon, color, isCompleted } = body

    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.goal.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Determine auto-completion: if savedAmount >= targetAmount, set isCompleted=true
    const finalSavedAmount =
      savedAmount !== undefined ? parseFloat(String(savedAmount)) : existing.savedAmount
    const finalTargetAmount =
      targetAmount !== undefined ? parseFloat(String(targetAmount)) : existing.targetAmount

    const autoCompleted = finalSavedAmount >= finalTargetAmount

    const goal = await db.goal.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(targetAmount !== undefined && { targetAmount: parseFloat(String(targetAmount)) }),
        ...(savedAmount !== undefined && { savedAmount: parseFloat(String(savedAmount)) }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        isCompleted: isCompleted !== undefined ? isCompleted : autoCompleted,
      },
    })

    return NextResponse.json({
      goal: {
        ...goal,
        progressPercent: Math.min(
          Math.round((goal.savedAmount / goal.targetAmount) * 100),
          100
        ),
      },
    })
  } catch (error) {
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

// DELETE /api/goals - Delete a goal by id
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('id')

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.goal.findUnique({ where: { id: goalId } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await db.goal.delete({ where: { id: goalId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
