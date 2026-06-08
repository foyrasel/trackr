'use client'

import React, { useState } from 'react'
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
import { Check, X, Edit3, Loader2 } from 'lucide-react'

export interface CategorizedTransaction {
  type: string
  amount: number
  description: string
  category: string
  spendingType: string
  classification: string
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
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<CategorizedTransaction>({ ...data })

  const categories = data.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const currentData = isEditing ? editData : data

  const handleConfirm = () => {
    onConfirm(isEditing ? editData : data)
  }

  const classificationInfo = CLASSIFICATION_LABELS[currentData.classification] || CLASSIFICATION_LABELS.need

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {data.type === 'income' ? '💰 Income' : '💸 Expense'} Detected
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit3 className="w-4 h-4 mr-1" />
            {isEditing ? 'Done' : 'Edit'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div className="text-center">
          {isEditing ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-bold text-muted-foreground">৳</span>
              <Input
                type="number"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                className="text-2xl font-bold w-40 text-center"
              />
            </div>
          ) : (
            <p className="text-4xl font-bold">
              ৳{currentData.amount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs text-muted-foreground">Description</Label>
          {isEditing ? (
            <Input
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="mt-1"
            />
          ) : (
            <p className="font-medium">{currentData.description}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <Label className="text-xs text-muted-foreground">Category</Label>
          {isEditing ? (
            <Select
              value={editData.category}
              onValueChange={(value) => setEditData({ ...editData, category: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium">{currentData.category}</p>
          )}
        </div>

        {/* Spending Type */}
        <div>
          <Label className="text-xs text-muted-foreground">Payment Method</Label>
          {isEditing ? (
            <Select
              value={editData.spendingType}
              onValueChange={(value) => setEditData({ ...editData, spendingType: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="debit">💳 Debit Card</SelectItem>
                <SelectItem value="credit">💳 Credit Card</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="font-medium capitalize">
              {currentData.spendingType === 'cash' ? '💵 Cash' : 
               currentData.spendingType === 'debit' ? '💳 Debit' : '💳 Credit'}
            </p>
          )}
        </div>

        {/* Classification Badge */}
        <div>
          <Label className="text-xs text-muted-foreground">Classification</Label>
          <div className="mt-1">
            {isEditing && data.type === 'expense' ? (
              <Select
                value={editData.classification}
                onValueChange={(value) => setEditData({ ...editData, classification: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLASSIFICATION_LABELS)
                    .filter(([key]) => key !== 'income')
                    .map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`${classificationInfo.color} border text-sm px-3 py-1`}>
                {classificationInfo.label}
              </Badge>
            )}
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
