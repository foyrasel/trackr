'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Repeat,
  Calendar as CalendarIcon,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  AlertCircle,
  DollarSign,
  Sun,
  Sunrise,
  Clock,
  CalendarDays,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useCurrency } from './CurrencyContext'

interface RecurringTransaction {
  id: string
  type: 'expense' | 'income'
  description: string
  amount: number
  category: string
  paymentMethod: string
  classification: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dayOfMonth?: number
  dayOfWeek?: number
  startDate: string
  endDate?: string
  nextExecutionDate: string
  isActive: boolean
}

interface RecurringPanelProps {
  userName?: string
  refreshTrigger?: number
}

const EXPENSE_CATEGORIES = [
  'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
  'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
  'Gadgets & Electronics', 'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other',
]

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Rental',
  'Side Hustle', 'Gift Received', 'Refund', 'Other',
]

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'debit', label: '💳 Debit Card' },
  { value: 'credit', label: '💳 Credit Card' },
  { value: 'mobile', label: '📱 Mobile' },
]

const CLASSIFICATIONS = [
  { value: 'need', label: 'Need', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'want', label: 'Want', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'ego', label: 'Ego', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'savings', label: 'Savings', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { value: 'debt', label: 'Debt', color: 'bg-purple-100 text-purple-800 border-purple-300' },
]

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', icon: Sun },
  { value: 'weekly', label: 'Weekly', icon: Sunrise },
  { value: 'monthly', label: 'Monthly', icon: Clock },
  { value: 'yearly', label: 'Yearly', icon: CalendarDays },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface FormState {
  type: 'expense' | 'income'
  description: string
  amount: string
  category: string
  paymentMethod: string
  classification: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  dayOfMonth: string
  dayOfWeek: string
  startDate: Date | undefined
  endDate: Date | undefined
  noEndDate: boolean
}

const emptyForm: FormState = {
  type: 'expense',
  description: '',
  amount: '',
  category: '',
  paymentMethod: '',
  classification: 'need',
  frequency: 'monthly',
  dayOfMonth: '1',
  dayOfWeek: '1',
  startDate: undefined,
  endDate: undefined,
  noEndDate: true,
}

export default function RecurringPanel({ userName, refreshTrigger }: RecurringPanelProps) {
  const { currencySymbol } = useCurrency()
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [autoCreatedCount, setAutoCreatedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecurringTransaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({ ...emptyForm })
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

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

  const fetchRecurring = useCallback(async () => {
    try {
      const response = await fetch('/api/recurring', {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setRecurring(data.recurring || [])
        setAutoCreatedCount(data.autoCreatedCount || 0)
      }
    } catch (error) {
      console.error('Error fetching recurring transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchRecurring()
  }, [fetchRecurring, refreshTrigger, mounted])

  // Show auto-created toast once when count changes
  useEffect(() => {
    if (autoCreatedCount > 0 && mounted) {
      toast({
        title: 'Recurring Transactions Processed',
        description: `${autoCreatedCount} recurring transaction${autoCreatedCount > 1 ? 's were' : ' was'} just auto-created.`,
      })
    }
  }, [autoCreatedCount])

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      const response = await fetch('/api/recurring', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      })
      if (response.ok) {
        toast({
          title: item.isActive ? 'Recurring Paused' : 'Recurring Activated',
          description: item.isActive
            ? `"${item.description}" will no longer auto-create transactions.`
            : `"${item.description}" will resume auto-creating transactions.`,
        })
        fetchRecurring()
      }
    } catch (error) {
      console.error('Error toggling recurring:', error)
      toast({ title: 'Failed to update', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const response = await fetch(`/api/recurring?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        toast({
          title: 'Recurring Deleted',
          description: `"${deleteTarget.description}" has been removed.`,
        })
        fetchRecurring()
      }
    } catch (error) {
      console.error('Error deleting recurring:', error)
      toast({ title: 'Failed to delete', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const openAddDialog = () => {
    setForm({ ...emptyForm, startDate: new Date() })
    setShowAddDialog(true)
  }

  const openEditDialog = (item: RecurringTransaction) => {
    setEditingItem(item)
    setForm({
      type: item.type,
      description: item.description,
      amount: String(item.amount),
      category: item.category,
      paymentMethod: item.paymentMethod,
      classification: item.classification,
      frequency: item.frequency,
      dayOfMonth: item.dayOfMonth ? String(item.dayOfMonth) : '1',
      dayOfWeek: item.dayOfWeek != null ? String(item.dayOfWeek) : '1',
      startDate: item.startDate ? new Date(item.startDate) : new Date(),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
      noEndDate: !item.endDate,
    })
    setShowEditDialog(true)
  }

  const handleSave = async (isEdit: boolean) => {
    if (!form.description || !form.amount || !form.category || !form.paymentMethod || !form.startDate) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' })
      return
    }

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' })
      return
    }

    const payload: Record<string, unknown> = {
      type: form.type,
      description: form.description,
      amount,
      category: form.category,
      paymentMethod: form.paymentMethod,
      classification: form.type === 'expense' ? form.classification : 'income',
      frequency: form.frequency,
      dayOfMonth: form.frequency === 'monthly' || form.frequency === 'yearly' ? parseInt(form.dayOfMonth) || 1 : undefined,
      dayOfWeek: form.frequency === 'weekly' ? parseInt(form.dayOfWeek) : undefined,
      startDate: form.startDate.toISOString().split('T')[0],
      endDate: form.noEndDate ? null : (form.endDate ? form.endDate.toISOString().split('T')[0] : null),
    }

    if (isEdit && editingItem) {
      payload.id = editingItem.id
    }

    setSaving(true)
    try {
      const response = await fetch('/api/recurring', {
        method: isEdit ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: isEdit ? 'Recurring Updated' : 'Recurring Created',
          description: `"${form.description}" — ${currencySymbol}${amount.toLocaleString()}/${form.frequency}`,
        })
        setShowAddDialog(false)
        setShowEditDialog(false)
        setEditingItem(null)
        fetchRecurring()
      } else {
        toast({ title: 'Failed to save', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error saving recurring:', error)
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const getFrequencyIcon = (freq: string) => {
    const found = FREQUENCIES.find(f => f.value === freq)
    return found ? found.icon : Clock
  }

  const getFrequencyLabel = (freq: string) => {
    const found = FREQUENCIES.find(f => f.value === freq)
    return found ? found.label : freq
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const totalMonthlyCommitment = recurring
    .filter(r => r.isActive)
    .reduce((sum, r) => {
      switch (r.frequency) {
        case 'daily': return sum + r.amount * 30
        case 'weekly': return sum + r.amount * 4.33
        case 'monthly': return sum + r.amount
        case 'yearly': return sum + r.amount / 12
        default: return sum + r.amount
      }
    }, 0)

  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const activeRecurring = recurring.filter(r => r.isActive)
  const inactiveRecurring = recurring.filter(r => !r.isActive)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Recurring Transactions</h2>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            Auto-add
          </Badge>
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Recurring
        </Button>
      </div>

      {/* Auto-created message */}
      {autoCreatedCount > 0 && (
        <Card className="border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-800">
                <span className="font-semibold">{autoCreatedCount}</span> recurring transaction{autoCreatedCount > 1 ? 's were' : ' was'} just auto-created from your active schedules.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Commitment Summary */}
      {activeRecurring.length > 0 && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Monthly Commitment</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ${totalMonthlyCommitment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Active Schedules</p>
                <p className="text-lg font-bold text-emerald-600">{activeRecurring.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Recurring Transactions */}
      {activeRecurring.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Active</h3>
          {activeRecurring.map(item => {
            const FreqIcon = getFrequencyIcon(item.frequency)
            return (
              <Card key={item.id} className="border border-emerald-100 hover:border-emerald-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Top row: Type badge + Description + Amount */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-xs px-1.5 py-0 ${
                            item.type === 'expense'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {item.type === 'expense' ? 'Expense' : 'Income'}
                        </Badge>
                        <span className="text-sm font-medium truncate">{item.description}</span>
                        <span className="text-sm font-bold shrink-0">
                          <span className="text-muted-foreground">$</span>{item.amount.toLocaleString()}
                        </span>
                      </div>

                      {/* Category */}
                      <p className="text-xs text-muted-foreground">{item.category}</p>

                      {/* Frequency badge + Next execution date */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="text-xs gap-1 bg-emerald-50/50 text-emerald-700 border-emerald-200">
                          <FreqIcon className="w-3 h-3" />
                          {getFrequencyLabel(item.frequency)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Next on: {formatDate(item.nextExecutionDate)}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                        onClick={() => openEditDialog(item)}
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                        title="Delete"
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
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Repeat className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">No Recurring Transactions</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Set up recurring transactions like rent, salary, EMI, or subscriptions to auto-add them each period.
            </p>
            <Button onClick={openAddDialog} variant="outline" className="border-emerald-200 text-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Recurring
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Inactive Recurring Transactions */}
      {inactiveRecurring.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <ToggleLeft className="w-3.5 h-3.5" />
            Inactive
          </h3>
          {inactiveRecurring.map(item => {
            const FreqIcon = getFrequencyIcon(item.frequency)
            return (
              <Card key={item.id} className="border-dashed opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        className={`text-xs px-1.5 py-0 ${
                          item.type === 'expense'
                            ? 'bg-red-50 text-red-400 border-red-200'
                            : 'bg-emerald-50 text-emerald-400 border-emerald-200'
                        }`}
                      >
                        {item.type === 'expense' ? 'Expense' : 'Income'}
                      </Badge>
                      <span className="text-sm text-muted-foreground line-through truncate">{item.description}</span>
                      <span className="text-sm text-muted-foreground shrink-0">{currencySymbol}{item.amount.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs gap-0.5 bg-muted/50 text-muted-foreground">
                        <FreqIcon className="w-2.5 h-2.5" />
                        {getFrequencyLabel(item.frequency)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={showAddDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setShowEditDialog(false)
            setEditingItem(null)
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-emerald-500" />
              {showEditDialog ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog
                ? 'Update the details of your recurring transaction.'
                : 'Set up a transaction that will be automatically added on schedule.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Type Toggle */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: 'expense', classification: f.classification || 'need', category: '' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    form.type === 'expense'
                      ? 'bg-red-50 border-red-300 text-red-800'
                      : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
                  }`}
                >
                  💸 Expense
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: 'income', classification: 'income', category: '' }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    form.type === 'income'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-gray-200 text-muted-foreground hover:bg-gray-50'
                  }`}
                >
                  💰 Income
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g., Monthly Rent, Salary, EMI"
                className="mt-1"
              />
            </div>

            {/* Amount */}
            <div>
              <Label className="text-xs text-muted-foreground">Amount</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="pl-9"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm(f => ({ ...f, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(value) => setForm(f => ({ ...f, paymentMethod: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(pm => (
                    <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Classification (expense only) */}
            {form.type === 'expense' && (
              <div>
                <Label className="text-xs text-muted-foreground">Classification</Label>
                <Select
                  value={form.classification}
                  onValueChange={(value) => setForm(f => ({ ...f, classification: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSIFICATIONS.map(cl => (
                      <SelectItem key={cl.value} value={cl.value}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${cl.color.split(' ')[0]}`} />
                          {cl.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Frequency */}
            <div>
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(value) => setForm(f => ({ ...f, frequency: value as FormState['frequency'] }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(fr => {
                    const Icon = fr.icon
                    return (
                      <SelectItem key={fr.value} value={fr.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" />
                          {fr.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Day of Month (for Monthly/Yearly) */}
            {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
              <div>
                <Label className="text-xs text-muted-foreground">Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dayOfMonth}
                  onChange={(e) => setForm(f => ({ ...f, dayOfMonth: e.target.value }))}
                  placeholder="1-31"
                  className="mt-1"
                />
              </div>
            )}

            {/* Day of Week (for Weekly) */}
            {form.frequency === 'weekly' && (
              <div>
                <Label className="text-xs text-muted-foreground">Day of Week</Label>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(value) => setForm(f => ({ ...f, dayOfWeek: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.startDate ? format(form.startDate, 'MMM dd, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.startDate}
                    onSelect={(date) => {
                      setForm(f => ({ ...f, startDate: date ?? undefined }))
                      setStartCalOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noEndDate"
                    checked={form.noEndDate}
                    onCheckedChange={(checked) =>
                      setForm(f => ({ ...f, noEndDate: checked === true, endDate: checked === true ? undefined : f.endDate }))
                    }
                  />
                  <label htmlFor="noEndDate" className="text-xs text-muted-foreground cursor-pointer">
                    No end date
                  </label>
                </div>
              </div>
              {!form.noEndDate && (
                <Popover open={endCalOpen} onOpenChange={setEndCalOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.endDate ? format(form.endDate, 'MMM dd, yyyy') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.endDate}
                      onSelect={(date) => {
                        setForm(f => ({ ...f, endDate: date ?? undefined }))
                        setEndCalOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setShowEditDialog(false)
                setEditingItem(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave(showEditDialog)}
              disabled={saving || !form.description || !form.amount || !form.category || !form.paymentMethod}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Repeat className="w-4 h-4 mr-1" />
              )}
              {showEditDialog ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will permanently remove <strong>&quot;{deleteTarget.description}&quot;</strong> ({currencySymbol}{deleteTarget.amount.toLocaleString()}/{getFrequencyLabel(deleteTarget.frequency)}).
                  No future transactions will be auto-created from this schedule.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
