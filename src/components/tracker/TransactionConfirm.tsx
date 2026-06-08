'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Check, X, Loader2, Calendar } from 'lucide-react'

export interface CategorizedTransaction {
  type: string
  amount: number
  description: string
  category: string
  spendingType: string
  classification: string
  date: string // ISO date string (YYYY-MM-DD)
}

interface TransactionConfirmProps {
  data: CategorizedTransaction
  onConfirm: (data: CategorizedTransaction) => void
  onReject: () => void
  isSaving: boolean
}

const EXPENSE_CATEGORIES = [
  'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
  'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
  'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other'
]

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Rental',
  'Side Hustle', 'Gift Received', 'Refund', 'Other'
]

const CLASSIFICATION_LABELS: Record<string, { label: string; color: string }> = {
  need: { label: 'Need', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  want: { label: 'Want', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  ego: { label: 'Ego', color: 'bg-red-100 text-red-800 border-red-300' },
  savings: { label: 'Savings', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  debt: { label: 'Debt', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  income: { label: 'Income', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
}

export default function TransactionConfirm({ data, onConfirm, onReject, isSaving }: TransactionConfirmProps) {
  const [editData, setEditData] = useState<CategorizedTransaction>({ ...data })

  // Keep editData in sync if data prop changes
  useEffect(() => {
    setEditData({ ...data })
  }, [data])

  const categories = editData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleConfirm = () => {
    onConfirm(editData)
  }

  const classificationInfo = CLASSIFICATION_LABELS[editData.classification] || CLASSIFICATION_LABELS.need

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Today'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Check if date is different from today
  const isDateCustom = editData.date && editData.date !== new Date().toISOString().split('T')[0]

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {editData.type === 'income' ? '💰 Income' : '💸 Expense'} Detected
          </CardTitle>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            Tap any field to edit
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount - Always Editable */}
        <div className="text-center">
          <Label className="text-xs text-muted-foreground">Amount</Label>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-2xl font-bold text-muted-foreground">৳</span>
            <Input
              type="number"
              value={editData.amount || ''}
              onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
              className="text-3xl font-bold w-44 text-center border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50/50"
              placeholder="0"
            />
          </div>
        </div>

        {/* Date - Always Editable */}
        <div>
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Date
            {isDateCustom && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[9px] px-1 py-0 ml-1">
                Past Date
              </Badge>
            )}
          </Label>
          <Input
            type="date"
            value={editData.date || new Date().toISOString().split('T')[0]}
            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
            className="mt-1 border-2 border-blue-200 focus:border-blue-500 bg-blue-50/50"
            max={new Date().toISOString().split('T')[0]}
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatDate(editData.date)}
            {isDateCustom && ' — Previous expenditure'}
          </p>
        </div>

        {/* Description - Always Editable */}
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Input
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="mt-1 border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50/50"
          />
        </div>

        {/* Category - Always Editable */}
        <div>
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select
            value={editData.category}
            onValueChange={(value) => setEditData({ ...editData, category: value })}
          >
            <SelectTrigger className="mt-1 border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spending Type - Always Editable */}
        <div>
          <Label className="text-xs text-muted-foreground">Payment Method</Label>
          <Select
            value={editData.spendingType}
            onValueChange={(value) => setEditData({ ...editData, spendingType: value })}
          >
            <SelectTrigger className="mt-1 border-2 border-emerald-200 focus:border-emerald-500 bg-emerald-50/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">💵 Cash</SelectItem>
              <SelectItem value="debit">💳 Debit Card</SelectItem>
              <SelectItem value="credit">💳 Credit Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Classification - Always Editable (for expenses) */}
        <div>
          <Label className="text-xs text-muted-foreground">Classification</Label>
          {editData.type === 'expense' ? (
            <Select
              value={editData.classification}
              onValueChange={(value) => setEditData({ ...editData, classification: value })}
            >
              <SelectTrigger className={`mt-1 border-2 focus:border-emerald-500 bg-emerald-50/50 ${classificationInfo.color.replace('bg-', 'border-').split(' ')[0].replace('border-', 'border-')}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASSIFICATION_LABELS)
                  .filter(([key]) => key !== 'income')
                  .map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${CLASSIFICATION_LABELS[key].color.split(' ')[0]}`} />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1">
              <Badge className={`${CLASSIFICATION_LABELS.income.color} border text-sm px-3 py-1`}>
                Income
              </Badge>
            </div>
          )}
        </div>

        {/* Type Toggle */}
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setEditData({ ...editData, type: 'expense', classification: 'need' })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                editData.type === 'expense'
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => setEditData({ ...editData, type: 'income', classification: 'income' })}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                editData.type === 'income'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
              }`}
            >
              💰 Income
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            onClick={onReject}
            variant="outline"
            className="flex-1"
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
