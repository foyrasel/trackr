'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Trash2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
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
}

const CLASSIFICATION_BADGE: Record<string, { label: string; color: string }> = {
  need: { label: 'Need', color: 'bg-emerald-100 text-emerald-800' },
  want: { label: 'Want', color: 'bg-amber-100 text-amber-800' },
  ego: { label: 'Ego', color: 'bg-red-100 text-red-800' },
  savings: { label: 'Savings', color: 'bg-sky-100 text-sky-800' },
  debt: { label: 'Debt', color: 'bg-purple-100 text-purple-800' },
  income: { label: 'Income', color: 'bg-emerald-100 text-emerald-800' },
}

export default function TransactionList({ refreshTrigger }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Mark as mounted after first client render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : ''
      const response = await fetch(`/api/transactions?limit=50${typeParam}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    if (mounted) fetchTransactions()
  }, [fetchTransactions, refreshTrigger, mounted])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/transactions/${deleteId}`, { method: 'DELETE' })
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
        <Button variant="ghost" size="sm" onClick={fetchTransactions}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            No transactions found. Start adding some!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {transactions.map((tx) => {
            const badge = CLASSIFICATION_BADGE[tx.classification] || CLASSIFICATION_BADGE.need
            return (
              <Card key={tx.id} className="hover:shadow-sm transition-shadow">
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

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(tx.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
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
