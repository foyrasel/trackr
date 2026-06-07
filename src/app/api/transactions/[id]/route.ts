import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, amount, description, category, spendingType, classification, date, isRecurring } = body

    const updateData: Record<string, unknown> = {}
    if (type !== undefined) updateData.type = type
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (spendingType !== undefined) updateData.spendingType = spendingType
    if (classification !== undefined) updateData.classification = classification
    if (date !== undefined) updateData.date = new Date(date)
    if (isRecurring !== undefined) updateData.isRecurring = isRecurring

    const transaction = await db.transaction.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ transaction })
  } catch (error) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
