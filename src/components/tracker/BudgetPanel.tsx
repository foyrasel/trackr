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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Target, Sparkles, Plus, X, Eye, EyeOff, Loader2,
  AlertTriangle, TrendingDown, CheckCircle2, ArrowRight, Goal,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface BudgetItem {
  id: string
  category: string
  amount: number
  isIgnored: boolean
  spent: number
  remaining: number
  percentUsed: number
  goalId?: string
  goalName?: string
  goalIcon?: string
}

interface BudgetSuggestion {
  category: string
  suggestedBudget: number
  reason: string
  avgSpending?: number
}

interface GoalOption {
  id: string
  name: string
  icon: string
  targetAmount: number
  savedAmount: number
  progressPercent: number
}

interface BudgetPanelProps {
  refreshTrigger: number
  userName?: string
}

type ViewMode = 'my' | 'comparison'

const EXPENSE_CATEGORIES = [
  'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
  'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
  'Gadgets & Electronics', 'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other',
]

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#10b981',
  'Food & Dining': '#f59e0b',
  Transport: '#3b82f6',
  Utilities: '#8b5cf6',
  Rent: '#ef4444',
  Healthcare: '#ec4899',
  Education: '#06b6d4',
  Entertainment: '#f97316',
  Shopping: '#14b8a6',
  'Personal Care': '#a855f7',
  'Gadgets & Electronics': '#0284c7',
  Insurance: '#6366f1',
  Subscriptions: '#d946ef',
  Travel: '#0ea5e9',
  Gifts: '#fb923c',
  Charity: '#84cc16',
  Other: '#94a3b8',
}

export default function BudgetPanel({ refreshTrigger, userName }: BudgetPanelProps) {
  const { currencySymbol } = useCurrency()
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([])
  const [totalBudget, setTotalBudget] = useState(0)
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [newBudgetCategory, setNewBudgetCategory] = useState('')
  const [newBudgetAmount, setNewBudgetAmount] = useState('')
  const [newBudgetGoalId, setNewBudgetGoalId] = useState('none')
  const [showAddForm, setShowAddForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('my')
  const [goals, setGoals] = useState<GoalOption[]>([])

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    setMounted(true)
  }, [])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    return headers
  }, [userName])

  // Fetch goals
  useEffect(() => {
    if (!mounted) return
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals', {
          headers: getAuthHeaders(false),
        })
        if (response.ok) {
          const data = await response.json()
          setGoals((data.goals || []).map((g: { id: string; name: string; icon: string; targetAmount: number; savedAmount: number; progressPercent: number }) => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            targetAmount: g.targetAmount,
            savedAmount: g.savedAmount,
            progressPercent: g.progressPercent,
          })))
        }
      } catch (error) {
        console.error('Error fetching goals:', error)
      }
    }
    fetchGoals()
  }, [mounted, getAuthHeaders])

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets?month=${currentMonth}`, {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        // Map goal info into budgets
        const enrichedBudgets = (data.budgets || []).map((b: BudgetItem & { goalId?: string }) => {
          const linkedGoal = b.goalId ? goals.find(g => g.id === b.goalId) : null
          return {
            ...b,
            goalName: linkedGoal?.name,
            goalIcon: linkedGoal?.icon,
          }
        })
        setBudgets(enrichedBudgets)
        setTotalBudget(data.totalBudget)
        setTotalSpent(data.totalSpent)
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, getAuthHeaders, goals])

  useEffect(() => {
    if (mounted) fetchBudgets()
  }, [fetchBudgets, refreshTrigger, mounted])

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true)
    setShowSuggestions(true)
    try {
      const response = await fetch(`/api/budgets/suggest?month=${currentMonth}`, {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const handleCreateBudget = async (category: string, amount: number, isIgnored = false, goalId?: string) => {
    try {
      const body: Record<string, unknown> = { month: currentMonth, category, amount, isIgnored }
      if (goalId && goalId !== 'none') {
        body.goalId = goalId
      }
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({
          title: isIgnored ? 'Budget Skipped' : 'Budget Set',
          description: `${category}: ${currencySymbol}${amount.toLocaleString()}/month${isIgnored ? ' (ignored)' : ''}${goalId && goalId !== 'none' ? ' (linked to goal)' : ''}`,
        })
        fetchBudgets()
      }
    } catch (error) {
      console.error('Error creating budget:', error)
      toast({ title: 'Failed to set budget', variant: 'destructive' })
    }
  }

  const handleAddBudget = () => {
    if (!newBudgetCategory || !newBudgetAmount) return
    handleCreateBudget(newBudgetCategory, parseFloat(newBudgetAmount), false, newBudgetGoalId)
    setNewBudgetCategory('')
    setNewBudgetAmount('')
    setNewBudgetGoalId('none')
    setShowAddForm(false)
  }

  const handleIgnoreBudget = async (budgetId: string, isIgnored: boolean) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ budgetId, isIgnored }),
      })

      if (response.ok) {
        toast({
          title: isIgnored ? 'Budget Ignored' : 'Budget Activated',
          description: isIgnored ? 'This budget will not track spending.' : 'Budget tracking resumed.',
        })
        fetchBudgets()
      }
    } catch (error) {
      console.error('Error updating budget:', error)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const response = await fetch(`/api/budgets?id=${budgetId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        toast({ title: 'Budget removed' })
        fetchBudgets()
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  const applyAllSuggestions = () => {
    suggestions.forEach(s => {
      handleCreateBudget(s.category, s.suggestedBudget)
    })
    setShowSuggestions(false)
  }

  const applySuggestion = (s: BudgetSuggestion) => {
    const existingBudget = budgets.find(b => b.category === s.category)
    if (existingBudget) {
      // Update existing budget
      fetch('/api/budgets', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ budgetId: existingBudget.id, amount: s.suggestedBudget }),
      }).then(() => {
        toast({ title: `Applied AI suggestion for ${s.category}` })
        fetchBudgets()
      }).catch(() => {
        toast({ title: 'Failed to apply suggestion', variant: 'destructive' })
      })
    } else {
      handleCreateBudget(s.category, s.suggestedBudget)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
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

  const activeBudgets = budgets.filter(b => !b.isIgnored)
  const ignoredBudgets = budgets.filter(b => b.isIgnored)
  const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
  const categoriesWithoutBudget = EXPENSE_CATEGORIES.filter(
    cat => !budgets.some(b => b.category === cat)
  )

  // Build comparison data for AI vs Mine view
  const comparisonData = suggestions.map(s => {
    const myBudget = budgets.find(b => b.category === s.category && !b.isIgnored)
    return {
      category: s.category,
      myAmount: myBudget?.amount || 0,
      aiAmount: s.suggestedBudget,
      difference: (myBudget?.amount || 0) - s.suggestedBudget,
      percentDiff: s.suggestedBudget > 0
        ? Math.round((((myBudget?.amount || 0) - s.suggestedBudget) / s.suggestedBudget) * 100)
        : 0,
      hasBudget: !!myBudget,
      reason: s.reason,
      goalId: myBudget?.goalId,
      goalName: myBudget?.goalName,
      goalIcon: myBudget?.goalIcon,
    }
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Monthly Budget</h2>
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
            {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        <button
          type="button"
          onClick={() => setViewMode('my')}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            viewMode === 'my'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Budgets
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode('comparison')
            if (suggestions.length === 0) fetchSuggestions()
          }}
          className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            viewMode === 'comparison'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI vs Mine
        </button>
      </div>

      {/* Overall Budget Progress */}
      {activeBudgets.length > 0 && viewMode === 'my' && (
        <Card className={`border-2 ${budgetUtilization > 90 ? 'border-red-300' : budgetUtilization > 70 ? 'border-amber-300' : 'border-emerald-300'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">{currencySymbol}{totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className={`text-lg font-bold ${budgetUtilization > 90 ? 'text-red-600' : budgetUtilization > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {currencySymbol}{totalSpent.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{budgetUtilization}% used</span>
                <span className="text-muted-foreground">{currencySymbol}{Math.max(totalBudget - totalSpent, 0).toLocaleString()} remaining</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetUtilization > 90 ? 'bg-red-500' : budgetUtilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </div>
            </div>
            {budgetUtilization > 90 && (
              <div className="flex items-center gap-1.5 mt-2 text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Over budget! Cut spending immediately.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI vs Mine Comparison View */}
      {viewMode === 'comparison' && (
        <div className="space-y-3">
          {suggestionsLoading ? (
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
                <span className="text-sm text-muted-foreground">Loading AI suggestions...</span>
              </CardContent>
            </Card>
          ) : comparisonData.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-sm font-semibold mb-1">No AI Suggestions Yet</h3>
                <p className="text-muted-foreground text-xs mb-3">
                  Add some transactions first to get AI budget suggestions for comparison.
                </p>
                <Button onClick={fetchSuggestions} variant="outline" className="border-emerald-200 text-emerald-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Suggestions
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Comparison Table Header */}
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    AI vs Mine — Budget Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 pb-2 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    <div className="col-span-3">Category</div>
                    <div className="col-span-2 text-right">My Budget</div>
                    <div className="col-span-2 text-right">AI Suggested</div>
                    <div className="col-span-2 text-right">Difference</div>
                    <div className="col-span-3 text-right">Action</div>
                  </div>
                  {/* Rows */}
                  <div className="space-y-1 px-2 pb-3">
                    {comparisonData.map((row) => {
                      const isOver = row.difference > 0
                      const isUnder = row.difference < 0
                      return (
                        <div
                          key={row.category}
                          className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${
                            isOver
                              ? 'bg-red-50/50 border-red-200'
                              : isUnder
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-white border-gray-200'
                          }`}
                        >
                          {/* Category */}
                          <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[row.category] || '#94a3b8' }}
                            />
                            <span className="text-xs font-medium truncate">{row.category}</span>
                            {row.goalName && (
                              <span className="shrink-0" title={`Linked to: ${row.goalName}`}>
                                <Goal className="w-3 h-3 text-amber-500" />
                              </span>
                            )}
                          </div>
                          {/* My Budget */}
                          <div className="col-span-2 text-right">
                            {row.hasBudget ? (
                              <span className={`text-xs font-bold ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                                {currencySymbol}{row.myAmount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Not set</span>
                            )}
                          </div>
                          {/* AI Suggested */}
                          <div className="col-span-2 text-right">
                            <span className="text-xs font-bold text-amber-700">
                              {currencySymbol}{row.aiAmount.toLocaleString()}
                            </span>
                          </div>
                          {/* Difference */}
                          <div className="col-span-2 text-right">
                            {row.hasBudget ? (
                              <div>
                                <span className={`text-xs font-bold ${isOver ? 'text-red-600' : isUnder ? 'text-emerald-600' : 'text-gray-600'}`}>
                                  {isOver ? '+' : ''}{currencySymbol}{Math.abs(row.difference).toLocaleString()}
                                </span>
                                <p className={`text-[9px] ${isOver ? 'text-red-500' : isUnder ? 'text-emerald-500' : 'text-gray-400'}`}>
                                  {isOver ? 'Over' : isUnder ? 'Under' : 'Same'} {Math.abs(row.percentDiff)}%
                                </p>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </div>
                          {/* Action */}
                          <div className="col-span-3 text-right">
                            {!row.hasBudget ? (
                              <Button
                                size="sm"
                                className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 px-2"
                                onClick={() => handleCreateBudget(row.category, row.aiAmount)}
                              >
                                <Plus className="w-3 h-3 mr-0.5" />
                                Create
                              </Button>
                            ) : row.difference !== 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px] px-2"
                                onClick={() => applySuggestion({ category: row.category, suggestedBudget: row.aiAmount, reason: row.reason })}
                              >
                                <ArrowRight className="w-3 h-3 mr-0.5" />
                                Apply AI
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                                Match
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
              {/* Apply All */}
              <Button
                onClick={applyAllSuggestions}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply All AI Suggestions
              </Button>
            </>
          )}
        </div>
      )}

      {/* AI Suggestion Button & Add Button (only in My Budgets view) */}
      {viewMode === 'my' && (
        <div className="flex gap-2">
          <Button
            onClick={fetchSuggestions}
            disabled={suggestionsLoading}
            variant="outline"
            className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {suggestionsLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            AI Budget Suggestions
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="outline"
            className="border-emerald-200"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* AI Suggestions Panel (only in My Budgets view) */}
      {viewMode === 'my' && showSuggestions && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                AI-Suggested Budgets
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSuggestions(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              </div>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add some transactions first to get AI budget suggestions.
              </p>
            ) : (
              <>
                {suggestions.map((s) => (
                  <div key={s.category} className="flex items-center justify-between p-2 rounded-lg bg-white border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[s.category] || '#94a3b8' }}
                        />
                        <span className="text-sm font-medium">{s.category}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">{s.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold">{currencySymbol}{s.suggestedBudget.toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleCreateBudget(s.category, s.suggestedBudget)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={applyAllSuggestions}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply All Suggestions
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Budget Form */}
      {showAddForm && (
        <Card className="border-2 border-emerald-200">
          <CardContent className="p-4 space-y-3">
            <Select value={newBudgetCategory} onValueChange={setNewBudgetCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesWithoutBudget.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{currencySymbol}</span>
                <Input
                  type="number"
                  placeholder="Budget amount"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button onClick={handleAddBudget} disabled={!newBudgetCategory || !newBudgetAmount} className="bg-emerald-600 hover:bg-emerald-700">
                Add
              </Button>
            </div>
            {/* Link to Goal */}
            <div>
              <label className="text-xs text-muted-foreground font-medium">Link to Goal (optional)</label>
              <Select value={newBudgetGoalId} onValueChange={setNewBudgetGoalId}>
                <SelectTrigger className="h-11 mt-1">
                  <SelectValue placeholder="Select a goal (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal link</SelectItem>
                  {goals.filter(g => !g.progressPercent || g.progressPercent < 100).map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.icon} {g.name} ({g.progressPercent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newBudgetGoalId && newBudgetGoalId !== 'none' && (() => {
                const goal = goals.find(g => g.id === newBudgetGoalId)
                return goal ? (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <Goal className="w-3 h-3" />
                    Staying within this budget helps reach your {goal.name} goal
                  </p>
                ) : null
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Budgets */}
      {viewMode === 'my' && activeBudgets.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Active Budgets</h3>
          {activeBudgets.map(budget => {
            const isOverBudget = budget.percentUsed > 100
            const isWarning = budget.percentUsed > 80
            return (
              <Card key={budget.id} className={`border ${isOverBudget ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-emerald-200'}`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[budget.category] || '#94a3b8' }}
                      />
                      <span className="text-sm font-medium">{budget.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => handleIgnoreBudget(budget.id, true)}
                        title="Ignore this budget"
                      >
                        <EyeOff className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteBudget(budget.id)}
                        title="Remove budget"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={isOverBudget ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                      {currencySymbol}{budget.spent.toLocaleString()} / {currencySymbol}{budget.amount.toLocaleString()}
                    </span>
                    <span className={isOverBudget ? 'text-red-600 font-bold' : isWarning ? 'text-amber-600 font-medium' : 'text-emerald-600'}>
                      {budget.percentUsed}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                    />
                  </div>
                  {isOverBudget && (
                    <div className="flex items-center gap-1 mt-1.5 text-red-600">
                      <TrendingDown className="w-3 h-3" />
                      <span className="text-[10px] font-medium">Over by {currencySymbol}{Math.abs(budget.remaining).toLocaleString()}</span>
                    </div>
                  )}
                  {/* Goal link info */}
                  {budget.goalName && (
                    <div className="flex items-center gap-1.5 mt-1.5 p-1.5 rounded-md bg-amber-50 border border-amber-200">
                      <span className="text-sm">{budget.goalIcon || '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium text-amber-700 truncate">
                          Linked to: {budget.goalName}
                        </p>
                        <p className="text-[9px] text-amber-600">
                          Staying within this budget helps reach your {budget.goalName} goal
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : viewMode === 'my' && activeBudgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">No Budgets Set</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Set a monthly budget to track your spending and stay on target.
            </p>
            <Button onClick={fetchSuggestions} variant="outline" className="border-emerald-200 text-emerald-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Ignored Budgets */}
      {viewMode === 'my' && ignoredBudgets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" />
            Ignored Budgets
          </h3>
          {ignoredBudgets.map(budget => (
            <Card key={budget.id} className="border-dashed opacity-60">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                  <span className="text-sm line-through text-muted-foreground">{budget.category}</span>
                  <Badge variant="outline" className="text-[9px]">Ignored</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-emerald-600"
                    onClick={() => handleIgnoreBudget(budget.id, false)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Activate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteBudget(budget.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
