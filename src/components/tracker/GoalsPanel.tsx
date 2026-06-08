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
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CalendarIcon,
  Trophy,
  Clock,
  DollarSign,
  PartyPopper,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface GoalItem {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  deadline?: string | null
  icon: string
  color: string
  isCompleted: boolean
}

interface GoalsPanelProps {
  userName?: string
  refreshTrigger?: number
}

const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '💍', '📚', '🏥', '🎮', '💰', '🛍️']

const GOAL_COLORS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

function getDaysRemaining(deadline: string): number {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function GoalsPanel({ userName, refreshTrigger }: GoalsPanelProps) {
  const [goals, setGoals] = useState<GoalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formTarget, setFormTarget] = useState('')
  const [formSaved, setFormSaved] = useState('0')
  const [formDeadline, setFormDeadline] = useState<Date | undefined>(undefined)
  const [formIcon, setFormIcon] = useState('🎯')
  const [formColor, setFormColor] = useState('#10b981')

  // Add funds state
  const [addFundsAmount, setAddFundsAmount] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    return headers
  }, [userName])

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch('/api/goals', {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || data || [])
      }
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    if (mounted) fetchGoals()
  }, [fetchGoals, refreshTrigger, mounted])

  const resetForm = useCallback(() => {
    setFormName('')
    setFormTarget('')
    setFormSaved('0')
    setFormDeadline(undefined)
    setFormIcon('🎯')
    setFormColor('#10b981')
  }, [])

  const openAddDialog = useCallback(() => {
    resetForm()
    setShowAddDialog(true)
  }, [resetForm])

  const openEditDialog = useCallback((goal: GoalItem) => {
    setSelectedGoal(goal)
    setFormName(goal.name)
    setFormTarget(String(goal.targetAmount))
    setFormSaved(String(goal.savedAmount))
    setFormDeadline(goal.deadline ? new Date(goal.deadline) : undefined)
    setFormIcon(goal.icon)
    setFormColor(goal.color)
    setShowEditDialog(true)
  }, [])

  const openAddFundsDialog = useCallback((goal: GoalItem) => {
    setSelectedGoal(goal)
    setAddFundsAmount('')
    setShowAddFundsDialog(true)
  }, [])

  const openDeleteDialog = useCallback((goal: GoalItem) => {
    setSelectedGoal(goal)
    setShowDeleteDialog(true)
  }, [])

  const handleCreateGoal = useCallback(async () => {
    if (!formName.trim() || !formTarget) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formName.trim(),
          targetAmount: parseFloat(formTarget),
          savedAmount: parseFloat(formSaved) || 0,
          deadline: formDeadline ? formDeadline.toISOString() : null,
          icon: formIcon,
          color: formColor,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Goal Created',
          description: `"${formName}" — $${parseFloat(formTarget).toLocaleString()} target`,
        })
        setShowAddDialog(false)
        resetForm()
        fetchGoals()
      } else {
        toast({ title: 'Failed to create goal', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error creating goal:', error)
      toast({ title: 'Failed to create goal', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [formName, formTarget, formSaved, formDeadline, formIcon, formColor, getAuthHeaders, resetForm, fetchGoals])

  const handleEditGoal = useCallback(async () => {
    if (!selectedGoal || !formName.trim() || !formTarget) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          goalId: selectedGoal.id,
          name: formName.trim(),
          targetAmount: parseFloat(formTarget),
          savedAmount: parseFloat(formSaved) || 0,
          deadline: formDeadline ? formDeadline.toISOString() : null,
          icon: formIcon,
          color: formColor,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Goal Updated',
          description: `"${formName}" has been updated.`,
        })
        setShowEditDialog(false)
        setSelectedGoal(null)
        resetForm()
        fetchGoals()
      } else {
        toast({ title: 'Failed to update goal', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating goal:', error)
      toast({ title: 'Failed to update goal', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [selectedGoal, formName, formTarget, formSaved, formDeadline, formIcon, formColor, getAuthHeaders, resetForm, fetchGoals])

  const handleAddFunds = useCallback(async () => {
    if (!selectedGoal || !addFundsAmount) return
    setSubmitting(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          goalId: selectedGoal.id,
          addAmount: parseFloat(addFundsAmount),
        }),
      })

      if (response.ok) {
        const newSaved = selectedGoal.savedAmount + parseFloat(addFundsAmount)
        const willComplete = newSaved >= selectedGoal.targetAmount
        toast({
          title: willComplete ? '🎉 Goal Completed!' : 'Funds Added',
          description: willComplete
            ? `Congratulations! "${selectedGoal.name}" is fully funded!`
            : `$${parseFloat(addFundsAmount).toLocaleString()} added to "${selectedGoal.name}"`,
        })
        setShowAddFundsDialog(false)
        setSelectedGoal(null)
        setAddFundsAmount('')
        fetchGoals()
      } else {
        toast({ title: 'Failed to add funds', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error adding funds:', error)
      toast({ title: 'Failed to add funds', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [selectedGoal, addFundsAmount, getAuthHeaders, fetchGoals])

  const handleDeleteGoal = useCallback(async () => {
    if (!selectedGoal) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/goals?id=${selectedGoal.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        toast({
          title: 'Goal Deleted',
          description: `"${selectedGoal.name}" has been removed.`,
        })
        setShowDeleteDialog(false)
        setSelectedGoal(null)
        fetchGoals()
      } else {
        toast({ title: 'Failed to delete goal', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      toast({ title: 'Failed to delete goal', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [selectedGoal, getAuthHeaders, fetchGoals])

  // Loading / hydration guard
  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const activeGoals = goals.filter(g => !g.isCompleted)
  const completedGoals = goals.filter(g => g.isCompleted)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Financial Goals</h2>
          {goals.length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              {activeGoals.length} active
            </Badge>
          )}
        </div>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 hover:bg-emerald-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Goal
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 ? (
        <div className="space-y-3">
          {activeGoals.map(goal => {
            const percent = goal.targetAmount > 0
              ? Math.min(Math.round((goal.savedAmount / goal.targetAmount) * 100), 100)
              : 0
            const daysLeft = goal.deadline ? getDaysRemaining(goal.deadline) : null
            const isOverdue = daysLeft !== null && daysLeft < 0
            const isNearDeadline = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

            return (
              <Card
                key={goal.id}
                className="border transition-all hover:shadow-md"
                style={{ borderLeftColor: goal.color, borderLeftWidth: '4px' }}
              >
                <CardContent className="p-4">
                  {/* Goal Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl" role="img" aria-label={goal.name}>
                        {goal.icon}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold leading-tight">{goal.name}</h3>
                        {goal.deadline && (
                          <div className={`flex items-center gap-1 mt-0.5 text-[11px] ${
                            isOverdue ? 'text-red-600' : isNearDeadline ? 'text-amber-600' : 'text-muted-foreground'
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>
                              {isOverdue
                                ? 'Overdue'
                                : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                              }
                            </span>
                            <span className="text-muted-foreground">
                              · {formatDate(goal.deadline)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                        onClick={() => openAddFundsDialog(goal)}
                        title="Add funds"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => openEditDialog(goal)}
                        title="Edit goal"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => openDeleteDialog(goal)}
                        title="Delete goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        ${goal.savedAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                      </span>
                      <span className="font-semibold" style={{ color: goal.color }}>
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: goal.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Add Funds Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs h-8"
                    onClick={() => openAddFundsDialog(goal)}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                    Add Funds
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : completedGoals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">No Goals Yet</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Set a financial goal to start tracking your savings progress.
            </p>
            <Button onClick={openAddDialog} variant="outline" className="border-emerald-200 text-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Completed Goals
          </h3>
          {completedGoals.map(goal => (
            <Card
              key={goal.id}
              className="border-2 border-amber-300 bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-white relative overflow-hidden"
            >
              {/* Confetti-like decorative dots */}
              <div className="absolute top-2 right-2 opacity-30 text-xs space-x-0.5">
                <span>✨</span><span>🎊</span><span>✨</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl" role="img" aria-label={goal.name}>
                      {goal.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{goal.name}</h3>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] hover:bg-amber-100">
                          <PartyPopper className="w-3 h-3 mr-0.5" />
                          Completed!
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${goal.targetAmount.toLocaleString()} goal reached
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => openEditDialog(goal)}
                      title="Edit goal"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => openDeleteDialog(goal)}
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="h-2 bg-amber-100 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: '100%' }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ====== ADD GOAL DIALOG ====== */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              New Financial Goal
            </DialogTitle>
            <DialogDescription>
              Set a savings target and track your progress.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Goal Name</label>
              <Input
                placeholder="e.g. Emergency Fund"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {/* Target Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  placeholder="10000"
                  value={formTarget}
                  onChange={e => setFormTarget(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Initial Saved Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Already Saved <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formSaved}
                  onChange={e => setFormSaved(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Deadline Date Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Deadline <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDeadline ? formatDate(formDeadline.toISOString()) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDeadline}
                    onSelect={setFormDeadline}
                    disabled={[{ before: new Date() }]}
                  />
                </PopoverContent>
              </Popover>
              {formDeadline && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setFormDeadline(undefined)}
                >
                  Clear date
                </Button>
              )}
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Icon</label>
              <div className="grid grid-cols-5 gap-1.5">
                {GOAL_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`h-9 rounded-md text-lg flex items-center justify-center border transition-all ${
                      formIcon === icon
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-input hover:bg-muted'
                    }`}
                    onClick={() => setFormIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-4 gap-1.5">
                {GOAL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 rounded-md flex items-center justify-center border-2 transition-all ${
                      formColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  >
                    {formColor === color && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGoal}
              disabled={!formName.trim() || !formTarget || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Create Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== EDIT GOAL DIALOG ====== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-500" />
              Edit Goal
            </DialogTitle>
            <DialogDescription>
              Update your savings goal details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Goal Name</label>
              <Input
                placeholder="e.g. Emergency Fund"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {/* Target Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  placeholder="10000"
                  value={formTarget}
                  onChange={e => setFormTarget(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Saved Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Saved Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formSaved}
                  onChange={e => setFormSaved(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Deadline Date Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Deadline <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDeadline ? formatDate(formDeadline.toISOString()) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDeadline}
                    onSelect={setFormDeadline}
                  />
                </PopoverContent>
              </Popover>
              {formDeadline && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setFormDeadline(undefined)}
                >
                  Clear date
                </Button>
              )}
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Icon</label>
              <div className="grid grid-cols-5 gap-1.5">
                {GOAL_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`h-9 rounded-md text-lg flex items-center justify-center border transition-all ${
                      formIcon === icon
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-input hover:bg-muted'
                    }`}
                    onClick={() => setFormIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-4 gap-1.5">
                {GOAL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 rounded-md flex items-center justify-center border-2 transition-all ${
                      formColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  >
                    {formColor === color && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditGoal}
              disabled={!formName.trim() || !formTarget || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== ADD FUNDS DIALOG ====== */}
      <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Add Funds
            </DialogTitle>
            <DialogDescription>
              {selectedGoal && (
                <>
                  Add money to <strong>{selectedGoal.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="space-y-4">
              {/* Current Progress Summary */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Savings</span>
                  <span className="font-semibold">${selectedGoal.savedAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-semibold">${selectedGoal.targetAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-semibold text-emerald-600">
                    ${Math.max(selectedGoal.targetAmount - selectedGoal.savedAmount, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Amount to Add</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={addFundsAmount}
                    onChange={e => setAddFundsAmount(e.target.value)}
                    className="pl-8"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick-add Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setAddFundsAmount(String(amount))}
                  >
                    +{amount}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddFundsDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFunds}
              disabled={!addFundsAmount || parseFloat(addFundsAmount) <= 0 || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4 mr-1" />
              )}
              Add Funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== DELETE CONFIRMATION DIALOG ====== */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Goal
            </DialogTitle>
            <DialogDescription>
              {selectedGoal && (
                <>
                  Are you sure you want to delete <strong>{selectedGoal.name}</strong>?
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedGoal && (
            <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
              <span className="text-2xl" role="img" aria-label={selectedGoal.name}>
                {selectedGoal.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{selectedGoal.name}</p>
                <p className="text-xs text-muted-foreground">
                  ${selectedGoal.savedAmount.toLocaleString()} saved of ${selectedGoal.targetAmount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGoal}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
