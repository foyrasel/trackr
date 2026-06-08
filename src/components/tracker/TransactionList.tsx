'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Trash2, Edit3, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Check, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  category: string
  spendingType: string
  classification: string
  date: string
  isRecurring: boolean
}

interface TransactionListProps {
  refreshTrigger: number
  userName?: string
}

const CLASSIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  need: { label: 'Need', color: 'bg-emerald-100 text-emerald-800' },
  want: { label: 'Want', color: 'bg-amber-100 text-amber-800' },
  ego: { label: 'Ego', color: 'bg-red-100 text-red-800' },
  savings: { label: 'Savings', color: 'bg-sky-100 text-sky-800' },
  debt: { label: 'Debt', color: 'bg-purple-100 text-purple-800' },
  income: { label: 'Income', color: 'bg-emerald-100 text-emerald-800' },
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

const CLASSIFICATION_LABELS: Record<string, string> = {
  need: 'Need',
  want: 'Want',
  ego: 'Ego',
  savings: 'Savings',
  debt: 'Debt',
  income: 'Income',
}

export default function TransactionList({ refreshTrigger, userName }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Edit state
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null)
  const [editData, setEditData] = useState<{
    amount: number
    description: string
    category: string
    spendingType: string
    classification: string
    date: string
    type: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const PAGE_SIZE = 30

  // Mark as mounted after first client render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    return headers
  }, [userName])

  const fetchTransactions = useCallback(async (append = false) => {
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : ''
      const offset = append ? transactions.length : 0
      const response = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=${offset}${typeParam}`, {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        if (append) {
          setTransactions(prev => [...prev, ...data.transactions])
        } else {
          setTransactions(data.transactions)
        }
        setTotal(data.total)
        setHasMore(data.transactions.length === PAGE_SIZE && (offset + data.transactions.length) < data.total)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [filter, transactions.length, getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchTransactions()
  }, [filter, refreshTrigger, mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/transactions/${deleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        toast({ title: 'Transaction deleted' })
        fetchTransactions()
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  const handleEditOpen = (tx: Transaction) => {
    setEditTransaction(tx)
    setEditData({
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      spendingType: tx.spendingType,
      classification: tx.classification,
      date: tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: tx.type,
    })
  }

  const handleEditSave = async () => {
    if (!editTransaction || !editData) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/transactions/${editTransaction.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editData),
      })
      if (response.ok) {
        toast({ title: 'Transaction updated' })
        setEditTransaction(null)
        setEditData(null)
        fetchTransactions()
      } else {
        toast({ title: 'Failed to update', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({ title: 'Failed to update', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const loadMore = () => {
    setLoadingMore(true)
    fetchTransactions(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Show loading skeleton until mounted (avoids hydration mismatch from Date/fetch)
  if (loading || !mounted) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const categories = editData?.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-muted-foreground">{total} transactions</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => fetchTransactions()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            No transactions found. Start adding some!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
            {transactions.map((tx) => {
              const badge = CLASSIFICATION_BADGE[tx.classification] || CLASSIFICATION_BADGE.need
              return (
                <Card key={tx.id} className="hover:shadow-sm transition-shadow group">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === 'income' 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.type === 'income' 
                          ? <ArrowUpRight className="w-5 h-5" /> 
                          : <ArrowDownRight className="w-5 h-5" />
                        }
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{tx.description}</p>
                          <p className={`font-bold text-sm whitespace-nowrap ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}৳{tx.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{tx.category}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.color}`}>
                            {badge.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {tx.spendingType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
                        </div>
                      </div>

                      {/* Edit & Delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-blue-600 h-8 w-8 p-0"
                          onClick={() => handleEditOpen(tx)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                          onClick={() => setDeleteId(tx.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Load More ({total - transactions.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={(open) => {
        if (!open) {
          setEditTransaction(null)
          setEditData(null)
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Transaction
            </DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
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

              {/* Amount */}
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold text-muted-foreground">৳</span>
                  <Input
                    type="number"
                    value={editData.amount || ''}
                    onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })}
                    className="text-lg font-bold"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                  className="mt-1"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
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
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
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
              </div>

              {/* Classification */}
              <div>
                <Label className="text-xs text-muted-foreground">Classification</Label>
                {editData.type === 'expense' ? (
                  <Select
                    value={editData.classification}
                    onValueChange={(value) => setEditData({ ...editData, classification: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CLASSIFICATION_LABELS)
                        .filter(([key]) => key !== 'income')
                        .map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className="bg-emerald-100 text-emerald-800 border text-sm px-3 py-1">Income</Badge>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditTransaction(null)
                    setEditData(null)
                  }}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleEditSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone and will reverse the balance effect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
