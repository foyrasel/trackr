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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Target, Sparkles, Plus, X, Eye, EyeOff, Loader2,
  AlertTriangle, TrendingDown, CheckCircle2,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BudgetItem {
  id: string
  category: string
  amount: number
  isIgnored: boolean
  spent: number
  remaining: number
  percentUsed: number
}

interface BudgetSuggestion {
  category: string
  suggestedBudget: number
  reason: string
  avgSpending?: number
}

interface BudgetPanelProps {
  refreshTrigger: number
  userName?: string
}

const EXPENSE_CATEGORIES = [
  'Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent',
  'Healthcare', 'Education', 'Entertainment', 'Shopping', 'Personal Care',
  'Insurance', 'Subscriptions', 'Travel', 'Gifts', 'Charity', 'Other',
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
  Insurance: '#6366f1',
  Subscriptions: '#d946ef',
  Travel: '#0ea5e9',
  Gifts: '#fb923c',
  Charity: '#84cc16',
  Other: '#94a3b8',
}

export default function BudgetPanel({ refreshTrigger, userName }: BudgetPanelProps) {
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
  const [showAddForm, setShowAddForm] = useState(false)

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

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await fetch(`/api/budgets?month=${currentMonth}`, {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setBudgets(data.budgets)
        setTotalBudget(data.totalBudget)
        setTotalSpent(data.totalSpent)
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, getAuthHeaders])

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

  const handleCreateBudget = async (category: string, amount: number, isIgnored = false) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ month: currentMonth, category, amount, isIgnored }),
      })

      if (response.ok) {
        toast({
          title: isIgnored ? 'Budget Skipped' : 'Budget Set',
          description: `${category}: ৳${amount.toLocaleString()}/month${isIgnored ? ' (ignored)' : ''}`,
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
    handleCreateBudget(newBudgetCategory, parseFloat(newBudgetAmount))
    setNewBudgetCategory('')
    setNewBudgetAmount('')
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

      {/* Overall Budget Progress */}
      {activeBudgets.length > 0 && (
        <Card className={`border-2 ${budgetUtilization > 90 ? 'border-red-300' : budgetUtilization > 70 ? 'border-amber-300' : 'border-emerald-300'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">৳{totalBudget.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Spent</p>
                <p className={`text-lg font-bold ${budgetUtilization > 90 ? 'text-red-600' : budgetUtilization > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ৳{totalSpent.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{budgetUtilization}% used</span>
                <span className="text-muted-foreground">৳{Math.max(totalBudget - totalSpent, 0).toLocaleString()} remaining</span>
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

      {/* AI Suggestion Button */}
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

      {/* AI Suggestions Panel */}
      {showSuggestions && (
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
                      <span className="text-sm font-bold">৳{s.suggestedBudget.toLocaleString()}</span>
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
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
          </CardContent>
        </Card>
      )}

      {/* Active Budgets */}
      {activeBudgets.length > 0 ? (
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
                      ৳{budget.spent.toLocaleString()} / ৳{budget.amount.toLocaleString()}
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
                      <span className="text-[10px] font-medium">Over by ৳{Math.abs(budget.remaining).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
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
      )}

      {/* Ignored Budgets */}
      {ignoredBudgets.length > 0 && (
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
