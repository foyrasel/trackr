'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
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
  Bell,
  BellRing,
  Clock,
  Check,
  Trash2,
  Edit3,
  Plus,
  AlertTriangle,
  Repeat,
  CalendarIcon,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useCurrency } from './CurrencyContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reminder {
  id: string
  title: string
  amount: number | null
  category: string
  dueDate: string
  remindDaysBefore: number
  isRecurring: boolean
  frequency: 'monthly' | 'yearly' | null
  isPaid: boolean
  isDismissed: boolean
  isDue: boolean
  daysUntilDue: number
}

interface RemindersPanelProps {
  userName?: string
  refreshTrigger?: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BILL_CATEGORIES = [
  'Utilities',
  'Rent',
  'Insurance',
  'Subscriptions',
  'Loan',
  'Credit Card',
  'Other',
] as const

const CATEGORY_COLORS: Record<string, string> = {
  Utilities: '#8b5cf6',
  Rent: '#ef4444',
  Insurance: '#6366f1',
  Subscriptions: '#d946ef',
  Loan: '#f59e0b',
  'Credit Card': '#3b82f6',
  Other: '#94a3b8',
}

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RemindersPanel({ userName, refreshTrigger }: RemindersPanelProps) {
  const { currencySymbol } = useCurrency()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDueDate, setFormDueDate] = useState<Date | undefined>(undefined)
  const [formRemindDaysBefore, setFormRemindDaysBefore] = useState('3')
  const [formIsRecurring, setFormIsRecurring] = useState(false)
  const [formFrequency, setFormFrequency] = useState<'monthly' | 'yearly'>('monthly')
  const [formSubmitting, setFormSubmitting] = useState(false)

  // Calendar popover open state
  const [calendarOpen, setCalendarOpen] = useState(false)

  // ─── Mounted guard ──────────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Auth headers ───────────────────────────────────────────────────────

  const getAuthHeaders = useCallback(
    (contentType = true): Record<string, string> => {
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
    },
    [userName]
  )

  // ─── Fetch reminders ───────────────────────────────────────────────────

  const fetchReminders = useCallback(async () => {
    try {
      const response = await fetch('/api/reminders', {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setReminders(data.reminders ?? data ?? [])
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchReminders()
  }, [fetchReminders, refreshTrigger, mounted])

  // ─── Reset form ────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormAmount('')
    setFormCategory('')
    setFormDueDate(undefined)
    setFormRemindDaysBefore('3')
    setFormIsRecurring(false)
    setFormFrequency('monthly')
    setFormSubmitting(false)
    setCalendarOpen(false)
  }, [])

  // ─── Open add dialog ──────────────────────────────────────────────────

  const openAddDialog = () => {
    resetForm()
    setShowAddDialog(true)
  }

  // ─── Open edit dialog ─────────────────────────────────────────────────

  const openEditDialog = (reminder: Reminder) => {
    setFormTitle(reminder.title)
    setFormAmount(reminder.amount != null ? String(reminder.amount) : '')
    setFormCategory(reminder.category)
    setFormDueDate(new Date(reminder.dueDate))
    setFormRemindDaysBefore(String(reminder.remindDaysBefore))
    setFormIsRecurring(reminder.isRecurring)
    setFormFrequency(reminder.frequency ?? 'monthly')
    setEditingReminder(reminder)
    setShowEditDialog(true)
  }

  // ─── Create reminder ──────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formTitle.trim() || !formCategory || !formDueDate) return
    setFormSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        title: formTitle.trim(),
        amount: formAmount ? parseFloat(formAmount) : null,
        category: formCategory,
        dueDate: formDueDate.toISOString(),
        remindDaysBefore: parseInt(formRemindDaysBefore, 10) || 3,
        isRecurring: formIsRecurring,
        frequency: formIsRecurring ? formFrequency : null,
      }
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (response.ok) {
        toast({ title: 'Reminder Created', description: `"${formTitle}" added to your reminders.` })
        setShowAddDialog(false)
        resetForm()
        fetchReminders()
      } else {
        toast({ title: 'Failed to create reminder', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      toast({ title: 'Failed to create reminder', variant: 'destructive' })
    } finally {
      setFormSubmitting(false)
    }
  }

  // ─── Update reminder ──────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!editingReminder || !formTitle.trim() || !formCategory || !formDueDate) return
    setFormSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        id: editingReminder.id,
        title: formTitle.trim(),
        amount: formAmount ? parseFloat(formAmount) : null,
        category: formCategory,
        dueDate: formDueDate.toISOString(),
        remindDaysBefore: parseInt(formRemindDaysBefore, 10) || 3,
        isRecurring: formIsRecurring,
        frequency: formIsRecurring ? formFrequency : null,
      }
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (response.ok) {
        toast({ title: 'Reminder Updated', description: `"${formTitle}" has been updated.` })
        setShowEditDialog(false)
        setEditingReminder(null)
        resetForm()
        fetchReminders()
      } else {
        toast({ title: 'Failed to update reminder', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
      toast({ title: 'Failed to update reminder', variant: 'destructive' })
    } finally {
      setFormSubmitting(false)
    }
  }

  // ─── Mark as paid ─────────────────────────────────────────────────────

  const handleMarkPaid = async (reminder: Reminder) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: reminder.id, isPaid: true }),
      })
      if (response.ok) {
        toast({ title: 'Marked as Paid', description: `"${reminder.title}" marked as paid.` })
        fetchReminders()
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast({ title: 'Failed to mark as paid', variant: 'destructive' })
    }
  }

  // ─── Dismiss reminder ─────────────────────────────────────────────────

  const handleDismiss = async (reminder: Reminder) => {
    try {
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: reminder.id, isDismissed: true }),
      })
      if (response.ok) {
        toast({ title: 'Reminder Dismissed', description: `"${reminder.title}" dismissed.` })
        fetchReminders()
      }
    } catch (error) {
      console.error('Error dismissing reminder:', error)
      toast({ title: 'Failed to dismiss reminder', variant: 'destructive' })
    }
  }

  // ─── Delete reminder ──────────────────────────────────────────────────

  const handleDelete = async (reminder: Reminder) => {
    try {
      const response = await fetch(`/api/reminders?id=${reminder.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        toast({ title: 'Reminder Deleted', description: `"${reminder.title}" has been removed.` })
        fetchReminders()
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      toast({ title: 'Failed to delete reminder', variant: 'destructive' })
    }
    setDeleteTarget(null)
  }

  // ─── Group reminders ──────────────────────────────────────────────────

  const dueNow = reminders.filter((r) => r.isDue && !r.isPaid)
  const upcoming = reminders.filter((r) => !r.isDue && !r.isPaid && r.daysUntilDue > 0 && r.daysUntilDue <= 7)
  const later = reminders.filter((r) => !r.isDue && !r.isPaid && r.daysUntilDue > 7)
  const paid = reminders.filter((r) => r.isPaid)

  // ─── Loading / Hydration guard ────────────────────────────────────────

  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ─── Reminder card renderer ───────────────────────────────────────────

  const renderReminderCard = (reminder: Reminder, variant: 'due' | 'upcoming' | 'later' | 'paid') => {
    const isOverdue = reminder.isDue && !reminder.isPaid
    const variantStyles = {
      due: 'border-red-200 bg-gradient-to-br from-red-50/50 to-white',
      upcoming: 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white',
      later: 'border-sky-200 bg-gradient-to-br from-sky-50/30 to-white',
      paid: 'border-muted opacity-60',
    }

    const daysBadgeStyles = {
      due: 'bg-red-100 text-red-700 border-red-200',
      upcoming: 'bg-amber-100 text-amber-700 border-amber-200',
      later: 'bg-sky-100 text-sky-700 border-sky-200',
      paid: 'bg-muted text-muted-foreground border-muted',
    }

    return (
      <Card key={reminder.id} className={cn('border transition-all', variantStyles[variant])}>
        <CardContent className="p-4">
          {/* Top row: title + amount + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {variant === 'due' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                {variant === 'upcoming' && <BellRing className="w-4 h-4 text-amber-500 shrink-0" />}
                {variant === 'later' && <Bell className="w-4 h-4 text-sky-500 shrink-0" />}
                {variant === 'paid' && <Check className="w-4 h-4 text-muted-foreground shrink-0" />}
                <span className={cn('text-sm font-semibold', variant === 'paid' && 'line-through text-muted-foreground')}>
                  {reminder.title}
                </span>
                {reminder.amount != null && (
                  <span className={cn('text-sm font-bold', variant === 'paid' ? 'text-muted-foreground' : 'text-emerald-600')}>
                    {currencySymbol}{reminder.amount.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Category badge */}
                <Badge
                  variant="outline"
                  className="text-xs border"
                  style={{
                    borderColor: CATEGORY_COLORS[reminder.category] || '#94a3b8',
                    color: CATEGORY_COLORS[reminder.category] || '#94a3b8',
                    backgroundColor: `${CATEGORY_COLORS[reminder.category] || '#94a3b8'}15`,
                  }}
                >
                  {reminder.category}
                </Badge>

                {/* Due date */}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {formatDueDate(reminder.dueDate)}
                </span>

                {/* Days badge */}
                {!reminder.isPaid && (
                  <Badge variant="outline" className={cn('text-xs', daysBadgeStyles[variant])}>
                    {isOverdue
                      ? `Overdue by ${Math.abs(reminder.daysUntilDue)} day${Math.abs(reminder.daysUntilDue) !== 1 ? 's' : ''}`
                      : reminder.daysUntilDue === 0
                        ? 'Due today'
                        : `${reminder.daysUntilDue} day${reminder.daysUntilDue !== 1 ? 's' : ''} left`}
                  </Badge>
                )}

                {/* Recurring badge */}
                {reminder.isRecurring && reminder.frequency && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                    <Repeat className="w-2.5 h-2.5" />
                    {FREQUENCY_LABELS[reminder.frequency] || reminder.frequency}
                  </Badge>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              {!reminder.isPaid && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => handleMarkPaid(reminder)}
                  title="Mark as Paid"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              )}
              {!reminder.isDismissed && !reminder.isPaid && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-muted-foreground/80"
                  onClick={() => handleDismiss(reminder)}
                  title="Dismiss"
                >
                  <Bell className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => openEditDialog(reminder)}
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(reminder)}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Section renderer ─────────────────────────────────────────────────

  const renderSection = (
    label: string,
    icon: React.ReactNode,
    items: Reminder[],
    variant: 'due' | 'upcoming' | 'later' | 'paid',
    labelClassName: string
  ) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-2">
        <h3 className={cn('text-sm font-semibold flex items-center gap-1.5', labelClassName)}>
          {icon}
          {label}
          <Badge variant="outline" className="text-xs ml-1">
            {items.length}
          </Badge>
        </h3>
        <div className="space-y-2">
          {items.map((r) => renderReminderCard(r, variant))}
        </div>
      </div>
    )
  }

  // ─── Form dialog (shared for add & edit) ──────────────────────────────

  const renderFormDialog = (
    open: boolean,
    onOpenChange: (open: boolean) => void,
    title: string,
    description: string,
    onSubmit: () => void,
    submitLabel: string
  ) => (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              placeholder="e.g. Electricity Bill"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          {/* Amount (optional) */}
          <div className="space-y-2">
            <Label htmlFor="reminder-amount">Amount (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
              <Input
                id="reminder-amount"
                type="number"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formCategory} onValueChange={setFormCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {BILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formDueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formDueDate ? format(formDueDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formDueDate}
                  onSelect={(date) => {
                    setFormDueDate(date ?? undefined)
                    setCalendarOpen(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Remind days before */}
          <div className="space-y-2">
            <Label htmlFor="remind-days">Remind me before (days)</Label>
            <Input
              id="remind-days"
              type="number"
              min={0}
              value={formRemindDaysBefore}
              onChange={(e) => setFormRemindDaysBefore(e.target.value)}
            />
          </div>

          {/* Is Recurring */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is-recurring" className="cursor-pointer">
              Recurring bill
            </Label>
            <Switch
              id="is-recurring"
              checked={formIsRecurring}
              onCheckedChange={setFormIsRecurring}
            />
          </div>

          {/* Frequency (only if recurring) */}
          {formIsRecurring && (
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={formFrequency} onValueChange={(v) => setFormFrequency(v as 'monthly' | 'yearly')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              resetForm()
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={formSubmitting || !formTitle.trim() || !formCategory || !formDueDate}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {formSubmitting ? 'Saving…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ─── Render ────────────────────────────────────────────────────────────

  const hasReminders = reminders.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Bill Reminders</h2>
          {hasReminders && (
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              {reminders.filter((r) => !r.isPaid).length} active
            </Badge>
          )}
        </div>
        <Button
          onClick={openAddDialog}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Reminder
        </Button>
      </div>

      {/* Sections */}
      {hasReminders ? (
        <div className="space-y-4">
          {renderSection(
            'Due Now',
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
            dueNow,
            'due',
            'text-red-600'
          )}
          {renderSection(
            'Upcoming',
            <Clock className="w-3.5 h-3.5 text-amber-500" />,
            upcoming,
            'upcoming',
            'text-amber-600'
          )}
          {renderSection(
            'Later',
            <Bell className="w-3.5 h-3.5 text-sky-500" />,
            later,
            'later',
            'text-sky-600'
          )}
          {renderSection(
            'Paid',
            <Check className="w-3.5 h-3.5 text-muted-foreground" />,
            paid,
            'paid',
            'text-muted-foreground'
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">No Reminders</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Add bill reminders so you never miss a due date.
            </p>
            <Button
              onClick={openAddDialog}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Reminder
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      {renderFormDialog(
        showAddDialog,
        setShowAddDialog,
        'Add Reminder',
        'Set up a new bill reminder to stay on top of your payments.',
        handleCreate,
        'Save'
      )}

      {/* Edit Dialog */}
      {renderFormDialog(
        showEditDialog,
        setShowEditDialog,
        'Edit Reminder',
        'Update the details of this reminder.',
        handleUpdate,
        'Update'
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
