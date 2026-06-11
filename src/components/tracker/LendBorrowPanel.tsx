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
import {
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Check,
  X,
  Edit3,
  Trash2,
  Loader2,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface LendBorrowRecord {
  id: string
  type: 'lend' | 'borrow'
  person: string
  amount: number
  description: string
  date: string
  dueDate?: string
  isSettled: boolean
}

interface LendBorrowSummary {
  totalLent: number
  totalBorrowed: number
  overdueCount: number
}

interface LendBorrowPanelProps {
  userName?: string
  refreshTrigger?: number
}

type TypeFilter = 'all' | 'lend' | 'borrow'
type StatusFilter = 'active' | 'settled' | 'all'

export default function LendBorrowPanel({ userName, refreshTrigger = 0 }: LendBorrowPanelProps) {
  const { currencySymbol } = useCurrency()
  const [records, setRecords] = useState<LendBorrowRecord[]>([])
  const [summary, setSummary] = useState<LendBorrowSummary>({ totalLent: 0, totalBorrowed: 0, overdueCount: 0 })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')

  // Add dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addData, setAddData] = useState<{
    type: 'lend' | 'borrow'
    person: string
    amount: number
    description: string
    date: string
    dueDate: string
  }>({
    type: 'lend',
    person: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Edit dialog
  const [editRecord, setEditRecord] = useState<LendBorrowRecord | null>(null)
  const [editData, setEditData] = useState<{
    type: 'lend' | 'borrow'
    person: string
    amount: number
    description: string
    date: string
    dueDate: string
  } | null>(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Mark as mounted after first client render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
    }
    return headers
  }, [userName])

  const fetchRecords = useCallback(async () => {
    try {
      const response = await fetch('/api/lend-borrow', {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
        setSummary({
          totalLent: data.totalLent || 0,
          totalBorrowed: data.totalBorrowed || 0,
          overdueCount: data.overdueCount || 0,
        })
      }
    } catch (error) {
      console.error('Error fetching lend/borrow records:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchRecords()
  }, [mounted, refreshTrigger, fetchRecords])

  // --- Actions ---

  const handleAdd = async () => {
    if (!addData.person.trim() || addData.amount <= 0) {
      toast({ title: 'Please fill in person name and amount', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch('/api/lend-borrow', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: addData.type,
          person: addData.person.trim(),
          amount: addData.amount,
          description: addData.description.trim(),
          date: addData.date,
          dueDate: addData.dueDate || null,
        }),
      })
      if (response.ok) {
        toast({ title: `${addData.type === 'lend' ? 'Lent' : 'Borrowed'} record added` })
        setShowAddDialog(false)
        resetAddForm()
        fetchRecords()
      } else {
        toast({ title: 'Failed to add record', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error adding record:', error)
      toast({ title: 'Failed to add record', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditOpen = (record: LendBorrowRecord) => {
    setEditRecord(record)
    setEditData({
      type: record.type,
      person: record.person,
      amount: record.amount,
      description: record.description,
      date: record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: record.dueDate ? new Date(record.dueDate).toISOString().split('T')[0] : '',
    })
  }

  const handleEditSave = async () => {
    if (!editRecord || !editData) return
    if (!editData.person.trim() || editData.amount <= 0) {
      toast({ title: 'Please fill in person name and amount', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const response = await fetch(`/api/lend-borrow/${editRecord.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: editData.type,
          person: editData.person.trim(),
          amount: editData.amount,
          description: editData.description.trim(),
          date: editData.date,
          dueDate: editData.dueDate || null,
        }),
      })
      if (response.ok) {
        toast({ title: 'Record updated' })
        setEditRecord(null)
        setEditData(null)
        fetchRecords()
      } else {
        toast({ title: 'Failed to update record', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating record:', error)
      toast({ title: 'Failed to update record', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettle = async (record: LendBorrowRecord) => {
    try {
      const response = await fetch(`/api/lend-borrow/${record.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isSettled: true }),
      })
      if (response.ok) {
        toast({ title: `${record.type === 'lend' ? 'Lent' : 'Borrowed'} record settled` })
        fetchRecords()
      } else {
        toast({ title: 'Failed to settle record', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error settling record:', error)
      toast({ title: 'Failed to settle record', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/lend-borrow/${deleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        toast({ title: 'Record deleted' })
        fetchRecords()
      } else {
        toast({ title: 'Failed to delete record', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      toast({ title: 'Failed to delete record', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  const resetAddForm = () => {
    setAddData({
      type: 'lend',
      person: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
    })
  }

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntilDue = (dueDate: string): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  // --- Filtered records ---

  const filteredRecords = records.filter((record) => {
    // Type filter
    if (typeFilter !== 'all' && record.type !== typeFilter) return false
    // Status filter
    if (statusFilter === 'active' && record.isSettled) return false
    if (statusFilter === 'settled' && !record.isSettled) return false
    return true
  })

  // --- Loading skeleton ---

  if (loading || !mounted) {
    return (
      <div className="space-y-4">
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Records skeleton */}
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

  // --- Record form (shared for Add & Edit) ---

  const renderRecordForm = (
    data: { type: 'lend' | 'borrow'; person: string; amount: number; description: string; date: string; dueDate: string },
    setData: (d: typeof data) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel: string
  ) => (
    <div className="space-y-4 py-2">
      {/* Type Toggle */}
      <div>
        <Label className="text-xs text-muted-foreground">Type</Label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setData({ ...data, type: 'lend' })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 flex items-center justify-center gap-1.5 ${
              data.type === 'lend'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Lent
          </button>
          <button
            type="button"
            onClick={() => setData({ ...data, type: 'borrow' })}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 flex items-center justify-center gap-1.5 ${
              data.type === 'borrow'
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            Borrowed
          </button>
        </div>
      </div>

      {/* Person Name */}
      <div>
        <Label className="text-xs text-muted-foreground">Person Name</Label>
        <Input
          value={data.person}
          onChange={(e) => setData({ ...data, person: e.target.value })}
          className="mt-1"
          placeholder="Who did you lend to / borrow from?"
        />
      </div>

      {/* Amount */}
      <div>
        <Label className="text-xs text-muted-foreground">Amount</Label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
          <Input
            type="number"
            value={data.amount || ''}
            onChange={(e) => setData({ ...data, amount: parseFloat(e.target.value) || 0 })}
            className="text-lg font-bold"
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          className="mt-1"
          placeholder="What is this for?"
        />
      </div>

      {/* Date */}
      <div>
        <Label className="text-xs text-muted-foreground">Date</Label>
        <Input
          type="date"
          value={data.date}
          onChange={(e) => setData({ ...data, date: e.target.value })}
          className="mt-1"
        />
      </div>

      {/* Due Date */}
      <div>
        <Label className="text-xs text-muted-foreground">Due Date (optional)</Label>
        <Input
          type="date"
          value={data.dueDate}
          onChange={(e) => setData({ ...data, dueDate: e.target.value })}
          className="mt-1"
          min={data.date}
        />
        {data.dueDate && (
          <p className="text-xs text-muted-foreground mt-1">
            Payback reminder: {formatDate(data.dueDate)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-1" />
          )}
          {saveLabel}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Lend &amp; Borrow</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => fetchRecords()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              resetAddForm()
              setShowAddDialog(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total Lent */}
        <Card className="border-emerald-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-xs sm:text-xs text-muted-foreground font-medium">Total Lent</p>
            </div>
            <p className="text-base sm:text-xl font-bold text-emerald-600">
              {currencySymbol}{summary.totalLent.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Total Borrowed */}
        <Card className="border-red-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              <p className="text-xs sm:text-xs text-muted-foreground font-medium">Total Borrowed</p>
            </div>
            <p className="text-base sm:text-xl font-bold text-red-600">
              {currencySymbol}{summary.totalBorrowed.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card className="border-orange-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-xs sm:text-xs text-muted-foreground font-medium">Overdue</p>
            </div>
            <p className="text-base sm:text-xl font-bold text-orange-600">
              {summary.overdueCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Type filter toggle */}
        <div className="flex gap-1">
          {([
            { key: 'all', label: 'All' },
            { key: 'lend', label: 'Lent' },
            { key: 'borrow', label: 'Borrowed' },
          ] as const).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={typeFilter === key ? 'default' : 'outline'}
              className={`text-xs h-8 ${
                typeFilter === key
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'hover:bg-emerald-50'
              }`}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {([
            { key: 'active', label: 'Active' },
            { key: 'settled', label: 'Settled' },
            { key: 'all', label: 'All' },
          ] as const).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? 'secondary' : 'ghost'}
              className={`text-xs h-8 ${
                statusFilter === key
                  ? 'bg-muted font-semibold'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <HandCoins className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">
              {records.length === 0 ? 'No Lend/Borrow Records' : 'No Records Match Filters'}
            </h3>
            <p className="text-xs">
              {records.length === 0
                ? 'Track money you lend to or borrow from others.'
                : 'Try adjusting your filters above.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-2">
          {filteredRecords.map((record) => {
            const isLent = record.type === 'lend'
            const isOverdue = !record.isSettled && record.dueDate && getDaysUntilDue(record.dueDate) < 0
            const daysUntilDue = record.dueDate ? getDaysUntilDue(record.dueDate) : null
            const isApproachingDue = !record.isSettled && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7

            return (
              <Card
                key={record.id}
                className={`hover:shadow-sm transition-shadow group ${
                  record.isSettled ? 'opacity-60' : ''
                } ${isOverdue ? 'border-red-300 border-2' : ''}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isLent
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {isLent
                        ? <ArrowUpRight className="w-5 h-5" />
                        : <ArrowDownRight className="w-5 h-5" />
                      }
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold text-sm truncate">{record.person}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 shrink-0 ${
                              isLent
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {isLent ? 'Lent' : 'Borrowed'}
                          </Badge>
                        </div>
                        <p className={`font-bold text-sm whitespace-nowrap ${
                          isLent ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {currencySymbol}{record.amount.toLocaleString()}
                        </p>
                      </div>

                      {/* Description */}
                      {record.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {record.description}
                        </p>
                      )}

                      {/* Date & Due Date Row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(record.date)}
                        </span>
                        {record.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due: {formatDate(record.dueDate)}
                          </span>
                        )}
                        {record.isSettled && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" />
                            Settled
                          </Badge>
                        )}
                        {/* Overdue badge */}
                        {isOverdue && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            {Math.abs(daysUntilDue!)} day{Math.abs(daysUntilDue!) !== 1 ? 's' : ''} overdue
                          </Badge>
                        )}
                        {/* Approaching due date badge */}
                        {isApproachingDue && daysUntilDue === 0 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                            Due today
                          </Badge>
                        )}
                        {isApproachingDue && daysUntilDue !== null && daysUntilDue > 0 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                            Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!record.isSettled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-emerald-600 h-8 w-8 p-0"
                          onClick={() => handleSettle(record)}
                          title="Mark as settled"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-blue-600 h-8 w-8 p-0"
                        onClick={() => handleEditOpen(record)}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                        onClick={() => setDeleteId(record.id)}
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
      )}

      {/* Add Record Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false)
          resetAddForm()
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Lend/Borrow Record
            </DialogTitle>
          </DialogHeader>
          {renderRecordForm(
            addData,
            setAddData,
            handleAdd,
            () => { setShowAddDialog(false); resetAddForm() },
            'Save'
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(open) => {
        if (!open) {
          setEditRecord(null)
          setEditData(null)
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Record
            </DialogTitle>
          </DialogHeader>
          {editData && renderRecordForm(
            editData,
            setEditData,
            handleEditSave,
            () => { setEditRecord(null); setEditData(null) },
            'Update'
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lend/borrow record? This action cannot be undone.
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
