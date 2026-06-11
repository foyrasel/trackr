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
import { Trash2, Edit3, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Check, X, Search, Download, Paperclip, ImagePlus, CheckSquare, Square } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'
import { useSession } from 'next-auth/react'
import PasswordVerifyDialog from './PasswordVerifyDialog'

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
  receiptUrl?: string
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
  'Gadgets & Electronics', 'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other'
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
  const { currencySymbol } = useCurrency()
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // New filter states
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)

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

  // Receipt viewer state
  const [receiptViewerUrl, setReceiptViewerUrl] = useState<string | null>(null)

  // Edit receipt state
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | undefined>(undefined)
  const [editReceiptUploading, setEditReceiptUploading] = useState(false)
  const editFileInputRef = React.useRef<HTMLInputElement>(null)

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  // Password verification for batch delete
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordVerifiedForBatch, setPasswordVerifiedForBatch] = useState(false)

  const PAGE_SIZE = 30

  // Check if current user needs password verification
  useEffect(() => {
    if (session?.user) {
      const h: Record<string, string> = {}
      if (userName) h['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) h['x-user-email'] = userEmail
        if (userId) h['x-user-id'] = userId
      }
      fetch('/api/user', { headers: h })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.provider === 'email') {
            setNeedsPassword(true)
          } else {
            setNeedsPassword(false)
          }
        })
        .catch(() => {})
    } else {
      setNeedsPassword(false)
    }
  }, [session, userName])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchText])

  // Mark as mounted after first client render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    // Also include email and id from localStorage for reliable user lookup
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
    }
    return headers
  }, [userName])

  const fetchTransactions = useCallback(async (append = false) => {
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : ''
      const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''
      const categoryParam = categoryFilter !== 'all' ? `&category=${encodeURIComponent(categoryFilter)}` : ''
      const fromDateParam = fromDate ? `&fromDate=${fromDate}` : ''
      const toDateParam = toDate ? `&toDate=${toDate}` : ''
      const offset = append ? transactions.length : 0
      const response = await fetch(`/api/transactions?limit=${PAGE_SIZE}&offset=${offset}${typeParam}${searchParam}${categoryParam}${fromDateParam}${toDateParam}`, {
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
  }, [filter, debouncedSearch, categoryFilter, fromDate, toDate, transactions.length, getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchTransactions()
  }, [filter, debouncedSearch, categoryFilter, fromDate, toDate, refreshTrigger, mounted, fetchTransactions])

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
    setEditReceiptUrl(tx.receiptUrl || undefined)
  }

  const handleEditReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({ title: 'Only JPEG, PNG, and WebP images are allowed', variant: 'destructive' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File size must be under 5MB', variant: 'destructive' })
      return
    }

    setEditReceiptUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (response.ok) {
        const data = await response.json()
        setEditReceiptUrl(data.receiptUrl)
      } else {
        toast({ title: 'Upload failed', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to upload receipt', variant: 'destructive' })
    } finally {
      setEditReceiptUploading(false)
      if (editFileInputRef.current) editFileInputRef.current.value = ''
    }
  }

  const removeEditReceipt = () => {
    setEditReceiptUrl(undefined)
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const handleEditSave = async () => {
    if (!editTransaction || !editData) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/transactions/${editTransaction.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...editData, receiptUrl: editReceiptUrl }),
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

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('format', 'csv')
      if (filter !== 'all') params.set('type', filter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const response = await fetch(`/api/export?${params.toString()}`, {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disposition = response.headers.get('Content-Disposition')
        const filename = disposition
          ? disposition.split('filename=')[1]?.replace(/"/g, '')
          : 'transactions.csv'
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({ title: 'CSV exported' })
      } else {
        toast({ title: 'Export failed', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast({ title: 'Export failed', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  // Multi-select handlers
  const toggleSelectMode = () => {
    setSelectMode(prev => !prev)
    setSelectedIds(new Set())
    setPasswordVerifiedForBatch(false)
  }

  const toggleSelectTransaction = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(transactions.map(tx => tx.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const handleBatchDeleteClick = () => {
    if (selectedIds.size === 0) return

    if (needsPassword && !passwordVerifiedForBatch) {
      // Show password dialog first
      setShowPasswordDialog(true)
    } else {
      // Already verified or no password needed, show confirmation
      setShowBatchDeleteConfirm(true)
    }
  }

  const handlePasswordVerifiedForBatch = () => {
    setPasswordVerifiedForBatch(true)
    // Now show the batch delete confirmation
    setShowBatchDeleteConfirm(true)
  }

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    try {
      const response = await fetch('/api/transactions/batch-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({ title: `${data.deleted} transaction${data.deleted !== 1 ? 's' : ''} deleted` })
        setSelectedIds(new Set())
        setSelectMode(false)
        setPasswordVerifiedForBatch(false)
        fetchTransactions()
      } else {
        toast({ title: 'Failed to delete transactions', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error batch deleting transactions:', error)
      toast({ title: 'Failed to delete transactions', variant: 'destructive' })
    } finally {
      setBatchDeleting(false)
      setShowBatchDeleteConfirm(false)
    }
  }

  const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]

  const hasActiveFilters = debouncedSearch || categoryFilter !== 'all' || fromDate || toDate

  const clearFilters = () => {
    setSearchText('')
    setCategoryFilter('all')
    setFromDate('')
    setToDate('')
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

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by description or person..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchText && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchText('')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 flex-1">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-8"
              onClick={clearFilters}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={handleExportCsv}
            disabled={exporting || transactions.length === 0}
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1" />
            )}
            Export
          </Button>
          <Button
            variant={selectMode ? 'default' : 'outline'}
            size="sm"
            className={`text-xs h-8 ${selectMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
            onClick={toggleSelectMode}
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" />
            {selectMode ? 'Done' : 'Select'}
          </Button>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{total} txns</span>
            )}
            <Button variant="ghost" size="sm" onClick={() => fetchTransactions()} className="h-8 w-8 p-0">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Select Mode Actions Bar */}
      {selectMode && (
        <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={allSelected ? deselectAll : selectAll}
            >
              {allSelected ? (
                <>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Select All
                </>
              )}
            </Button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs h-7"
            onClick={handleBatchDeleteClick}
            disabled={selectedIds.size === 0 || batchDeleting}
          >
            {batchDeleting ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 mr-1" />
            )}
            Delete Selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </div>
      )}

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
              const isSelected = selectedIds.has(tx.id)
              return (
                <Card key={tx.id} className={`hover:shadow-sm transition-shadow group ${isSelected ? 'ring-2 ring-emerald-400 border-emerald-300' : ''}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Checkbox (select mode) or Icon */}
                      {selectMode ? (
                        <button
                          type="button"
                          className="shrink-0 mt-0.5"
                          onClick={() => toggleSelectTransaction(tx.id)}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground hover:text-emerald-600 transition-colors" />
                          )}
                        </button>
                      ) : (
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
                      )}

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{tx.description}</p>
                          <p className={`font-bold text-sm whitespace-nowrap ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{tx.category}</span>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${badge.color}`}>
                            {badge.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {tx.spendingType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </span>
                          {tx.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setReceiptViewerUrl(tx.receiptUrl!)
                              }}
                              className="inline-flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3" />
                              Receipt
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete (hidden in select mode) */}
                      {!selectMode && (
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
                      )}
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
                  <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
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
                    <SelectItem value="mobile">📱 Mobile Wallet</SelectItem>
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

              {/* Receipt Photo */}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  Receipt Photo
                  <span className="text-xs text-muted-foreground/60 ml-1">(max 5MB)</span>
                </Label>
                <div className="mt-1.5">
                  {editReceiptUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border-2 border-emerald-200 bg-emerald-50/50">
                      <img
                        src={editReceiptUrl}
                        alt="Receipt"
                        className="w-full h-28 object-cover cursor-pointer"
                        onClick={() => setReceiptViewerUrl(editReceiptUrl)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => editFileInputRef.current?.click()}
                          disabled={editReceiptUploading}
                          className="h-7 text-xs"
                        >
                          <ImagePlus className="w-3.5 h-3.5 mr-1" />
                          Replace
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removeEditReceipt}
                          disabled={editReceiptUploading}
                          className="h-7 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
                      {editReceiptUploading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={editReceiptUploading}
                      className="w-full h-9 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                    >
                      {editReceiptUploading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {editReceiptUploading ? 'Uploading...' : 'Attach Receipt'}
                    </Button>
                  )}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleEditReceiptSelect}
                    className="hidden"
                  />
                </div>
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

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!receiptViewerUrl} onOpenChange={(open) => { if (!open) setReceiptViewerUrl(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Receipt
            </DialogTitle>
          </DialogHeader>
          {receiptViewerUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={receiptViewerUrl}
                alt="Receipt"
                className="w-full h-auto max-h-[70vh] object-contain bg-muted"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog (for batch delete) */}
      <PasswordVerifyDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onVerified={handlePasswordVerifiedForBatch}
        userName={userName}
      />

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone and will reverse the balance effect for each transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={batchDeleting}>
              {batchDeleting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Delete {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation Dialog */}
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
