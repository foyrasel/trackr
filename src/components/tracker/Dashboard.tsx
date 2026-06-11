'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  PiggyBank, BarChart3, Calendar, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Activity, Brain, Lightbulb,
  Sparkles, CalendarDays, Receipt, Gauge, Flame, X, RefreshCw,
} from 'lucide-react'
import BalanceCards from './BalanceCards'
import { Button } from '@/components/ui/button'
import { useCurrency } from './CurrencyContext'

interface AnalyticsData {
  currentMonth: string
  monthName: string
  monthShortName: string
  totalExpense: number
  totalIncome: number
  balance: number
  classificationBreakdown: {
    need: number
    want: number
    ego: number
    savings: number
    debt: number
  }
  categoryBreakdown: Record<string, number>
  incomeBreakdown: Record<string, number>
  spendingTypeBreakdown: Record<string, number>
  spendingTypeStats: {
    cash: { total: number; count: number; avgPerTxn: number }
    debit: { total: number; count: number; avgPerTxn: number }
    credit: { total: number; count: number; avgPerTxn: number }
    mobile: { total: number; count: number; avgPerTxn: number }
  }
  dailySpending: Record<string, number>
  dayOfWeekSpending: { day: string; amount: number }[]
  weekendTotal: number
  weekdayTotal: number
  topTransactions: {
    description: string
    amount: number
    category: string
    classification: string
    date: string
  }[]
  avgDailySpend: number
  projectedMonthEnd: number
  daysElapsed: number
  daysInMonth: number
  isViewingCurrentMonth: boolean
  biggestDay: { date: string; amount: number } | null
  smartInsights: string[]
  monthlyTrend: Record<string, { income: number; expense: number }>
  averageMonthlyExpense: number
  avgCategoryBreakdown: Record<string, number>
  avgClassificationBreakdown: {
    need: number
    want: number
    ego: number
    savings: number
    debt: number
  }
  avgVsCurrentLineData: { day: number; current: number; average: number }[]
  yearlyComparison: {
    year: number
    label: string
    totalExpense: number
    totalIncome: number
    avgMonthlyExpense: number
    months: number
  }[]
  allTimeAvgMonthlyExpense: number
  allTimeTotalExpense: number
  allTimeTotalIncome: number
  allTimeMonths: number
  alerts: string[]
  transactionCount: number
}

interface DashboardProps {
  refreshTrigger: number
  userName?: string
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  need: '#10b981',
  want: '#f59e0b',
  ego: '#ef4444',
  savings: '#3b82f6',
  debt: '#8b5cf6',
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  need: 'Needs (50%)',
  want: 'Wants (30%)',
  ego: 'Ego/Luxury',
  savings: 'Savings',
  debt: 'Debt Repayment',
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface BudgetWarning {
  category: string
  spent: number
  budget: number
  pct: number
}

export default function Dashboard({ refreshTrigger, userName }: DashboardProps) {
  const { currencySymbol } = useCurrency()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [yearlyView, setYearlyView] = useState<'overview' | 'yearly'>('overview')

  // Dismissible banners — keyed by string, stored in sessionStorage
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [budgetWarnings, setBudgetWarnings] = useState<BudgetWarning[]>([])
  const [recurringCount, setRecurringCount] = useState(0)

  const dismiss = (key: string) => {
    sessionStorage.setItem(`dismissed_${key}`, '1')
    setDismissed(prev => new Set([...prev, key]))
  }
  const isDismissed = (key: string) => dismissed.has(key) || !!sessionStorage.getItem(`dismissed_${key}`)

  useEffect(() => {
    setMounted(true)
    // Read recurring count stored by the hook
    const count = parseInt(sessionStorage.getItem('trackr_recurring_count') || '0', 10)
    if (count > 0) setRecurringCount(count)
  }, [])

  // Fetch budget warnings for current month only
  useEffect(() => {
    if (!mounted) return
    const headers: Record<string, string> = {}
    if (userName) headers['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const e = localStorage.getItem('trackr_user_email')
      const i = localStorage.getItem('trackr_user_id')
      if (e) headers['x-user-email'] = e
      if (i) headers['x-user-id'] = i
    }
    fetch('/api/budgets', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.budgets) return
        const warnings: BudgetWarning[] = d.budgets
          .filter((b: { isIgnored: boolean; percentUsed: number }) => !b.isIgnored && b.percentUsed >= 80)
          .map((b: { category: string; spent: number; amount: number; percentUsed: number }) => ({
            category: b.category,
            spent: b.spent,
            budget: b.amount,
            pct: b.percentUsed,
          }))
        setBudgetWarnings(warnings)
      })
      .catch(() => {})
  }, [mounted, userName, refreshTrigger])

  const fetchAnalytics = useCallback(async () => {
    try {
      const url = selectedMonth ? `/api/analytics?month=${selectedMonth}` : '/api/analytics'
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      // Also include email and id from localStorage for reliable user lookup
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
      const response = await fetch(url, { headers })
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, userName])

  useEffect(() => {
    if (mounted) {
      setLoading(true)
      fetchAnalytics()
    }
  }, [fetchAnalytics, refreshTrigger, mounted])

  const navigateMonth = (direction: -1 | 1) => {
    const base = selectedMonth || data?.currentMonth || (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })()
    const [year, month] = base.split('-').map(Number)
    const d = new Date(year, month - 1 + direction, 1)
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  const goToCurrentMonth = () => {
    setSelectedMonth(null)
  }

  const isCurrentMonth = !selectedMonth || (data?.currentMonth === (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })())

  if (loading || !mounted) {
    return (
      <div className="space-y-3">
        <div className="h-40 rounded-2xl bg-gradient-to-br from-gray-900/10 via-emerald-950/10 to-slate-900/10 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          No data available. Add your first transaction!
        </CardContent>
      </Card>
    )
  }

  // Prepare pie chart data
  const classificationData = Object.entries(data.classificationBreakdown)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: CLASSIFICATION_LABELS[key] || key,
      value,
      color: CLASSIFICATION_COLORS[key] || '#94a3b8',
    }))

  // Prepare category breakdown data
  const categoryData = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }))

  // Prepare monthly trend data
  const trendData = Object.entries(data.monthlyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
      income: values.income,
      expense: values.expense,
    }))

  // Average vs Current comparison data
  const diffFromAvg = data.averageMonthlyExpense > 0
    ? ((data.totalExpense - data.averageMonthlyExpense) / data.averageMonthlyExpense) * 100
    : 0

  // Classification comparison: current vs average
  const classificationComparison = [
    {
      name: 'Needs',
      current: data.classificationBreakdown.need,
      average: Math.round(data.avgClassificationBreakdown.need),
    },
    {
      name: 'Wants',
      current: data.classificationBreakdown.want,
      average: Math.round(data.avgClassificationBreakdown.want),
    },
    {
      name: 'Ego',
      current: data.classificationBreakdown.ego,
      average: Math.round(data.avgClassificationBreakdown.ego),
    },
    {
      name: 'Savings',
      current: data.classificationBreakdown.savings,
      average: Math.round(data.avgClassificationBreakdown.savings),
    },
    {
      name: 'Debt',
      current: data.classificationBreakdown.debt,
      average: Math.round(data.avgClassificationBreakdown.debt),
    },
  ].filter(item => item.current > 0 || item.average > 0)

  // Category comparison: current vs average
  const allCategories = new Set([
    ...Object.keys(data.categoryBreakdown),
    ...Object.keys(data.avgCategoryBreakdown),
  ])
  const categoryComparison = Array.from(allCategories)
    .map(cat => ({
      name: cat,
      current: data.categoryBreakdown[cat] || 0,
      average: Math.round(data.avgCategoryBreakdown[cat] || 0),
    }))
    .sort((a, b) => (b.current + b.average) - (a.current + a.average))
    .slice(0, 6)

  // Percentages for 50/30/20
  const totalClassified = data.classificationBreakdown.need + data.classificationBreakdown.want + data.classificationBreakdown.ego + data.classificationBreakdown.savings + data.classificationBreakdown.debt
  const needPercent = totalClassified > 0 ? Math.round((data.classificationBreakdown.need / totalClassified) * 100) : 0
  const wantPercent = totalClassified > 0 ? Math.round((data.classificationBreakdown.want / totalClassified) * 100) : 0
  const egoPercent = totalClassified > 0 ? Math.round((data.classificationBreakdown.ego / totalClassified) * 100) : 0

  // Yearly comparison chart data
  const yearlyChartData = data.yearlyComparison
    .sort((a, b) => a.year - b.year)
    .map(y => ({
      year: y.label,
      avgMonthly: y.avgMonthlyExpense,
      totalExpense: y.totalExpense,
    }))

  // Current day of month for chart reference line
  const today = new Date()
  const currentDayOfMonth = isCurrentMonth ? today.getDate() : new Date(parseInt(data.currentMonth.split('-')[0]), parseInt(data.currentMonth.split('-')[1]), 0).getDate()

  // Savings rate for header
  const savingsRate = data.totalIncome > 0
    ? Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)
    : null

  // Top 5 categories for progress bars
  const top5Categories = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const top5Max = top5Categories.length > 0 ? top5Categories[0][1] : 1
  const TOP5_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6']

  // Helper: dismissible inline banner
  const Banner = ({ id, color, icon: Icon, children }: { id: string; color: 'amber' | 'red' | 'emerald' | 'blue'; icon: React.ElementType; children: React.ReactNode }) => {
    if (isDismissed(id)) return null
    const colors = {
      amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200',
      red:   'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-200',
      emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200',
      blue: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-900 dark:text-blue-200',
    }
    const iconColors = { amber: 'text-amber-500', red: 'text-red-500', emerald: 'text-emerald-500', blue: 'text-blue-500' }
    return (
      <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${colors[color]}`}>
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColors[color]}`} />
        <div className="flex-1 min-w-0">{children}</div>
        <button onClick={() => dismiss(id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── 1. COMPACT HEADER CARD ─── */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-slate-900 text-white shadow-xl shadow-emerald-900/20 overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          {/* top row: nav + inline stats */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: month nav */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase leading-none">
                  {data.monthName.includes(' ') ? data.monthName.split(' ')[1] : new Date().getFullYear()}
                </p>
                <h2 className="text-2xl font-bold tracking-tight leading-tight truncate">
                  {data.monthShortName || data.monthName.split(' ')[0]}
                </h2>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95 flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: inline stats — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-0 flex-shrink-0">
              <div className="px-4 text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">Income</p>
                <p className="text-sm font-bold text-emerald-400 leading-tight">{currencySymbol}{data.totalIncome.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="px-4 text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">Expenses</p>
                <p className="text-sm font-bold text-rose-400 leading-tight">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="px-4 text-right">
                <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">Balance</p>
                <p className={`text-sm font-bold leading-tight ${data.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  {data.balance < 0 ? '-' : ''}{currencySymbol}{Math.abs(data.balance).toLocaleString()}
                </p>
              </div>
              {savingsRate !== null && (
                <>
                  <div className="w-px h-8 bg-white/15" />
                  <div className="px-4 text-right">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">Savings</p>
                    <p className="text-sm font-bold text-sky-300 leading-tight">{savingsRate}%</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* "← Now" link for past months */}
          {!isCurrentMonth && (
            <button
              onClick={goToCurrentMonth}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 mt-2 transition-colors block"
            >
              ← Now
            </button>
          )}

          {/* Progress bar — current month only */}
          {isCurrentMonth && data.daysInMonth > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-white/35 mb-1">
                <span>Day {data.daysElapsed} of {data.daysInMonth}</span>
                <span>{Math.round((data.daysElapsed / data.daysInMonth) * 100)}% through</span>
              </div>
              <div className="h-[3px] bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"
                  style={{ width: `${Math.min((data.daysElapsed / data.daysInMonth) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BANNERS (recurring + budget + general alerts) ─── */}
      {(recurringCount > 0 || budgetWarnings.length > 0 || data.alerts.length > 0) && (
        <div className="space-y-2">
          {/* Recurring transactions ran today */}
          {recurringCount > 0 && (
            <Banner id="recurring-ran" color="emerald" icon={RefreshCw}>
              <span className="font-medium">{recurringCount} recurring transaction{recurringCount > 1 ? 's' : ''} auto-logged today.</span>
              <span className="text-xs ml-1 opacity-75">Dashboard has been refreshed.</span>
            </Banner>
          )}

          {/* Budget threshold warnings */}
          {budgetWarnings.map(w => (
            <Banner
              key={w.category}
              id={`budget-${w.category}-${w.pct >= 100 ? 'over' : 'near'}`}
              color={w.pct >= 100 ? 'red' : 'amber'}
              icon={AlertTriangle}
            >
              <span className="font-medium">{w.category}:</span>{' '}
              {w.pct >= 100
                ? `Over budget — spent ${currencySymbol}${w.spent.toLocaleString()} of ${currencySymbol}${w.budget.toLocaleString()} (${w.pct}%)`
                : `${w.pct}% used — ${currencySymbol}${w.spent.toLocaleString()} of ${currencySymbol}${w.budget.toLocaleString()}`}
            </Banner>
          ))}

          {/* General spending alerts */}
          {data.alerts.map((alert, i) => (
            <Banner key={i} id={`alert-${i}-${alert.slice(0, 20)}`} color="amber" icon={AlertTriangle}>
              {alert}
            </Banner>
          ))}
        </div>
      )}

      {/* ─── 2. FOUR METRIC CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Income */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Income</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
            {currencySymbol}{data.totalIncome.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {data.transactionCount} transaction{data.transactionCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Expenses</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
            {currencySymbol}{data.totalExpense.toLocaleString()}
          </p>
          {data.averageMonthlyExpense > 0 ? (
            <p className={`text-[11px] mt-1 font-medium ${diffFromAvg > 10 ? 'text-rose-500' : diffFromAvg < -10 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {diffFromAvg > 0 ? '↑' : '↓'}{Math.abs(diffFromAvg).toFixed(0)}% vs avg
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-1">this month</p>
          )}
        </div>

        {/* Net Balance */}
        <div className={`rounded-2xl p-4 shadow-sm ${data.balance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-rose-500 to-red-500'}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-white/70 font-medium">Net Balance</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-white leading-none">
            {data.balance < 0 ? '-' : ''}{currencySymbol}{Math.abs(data.balance).toLocaleString()}
          </p>
          <p className="text-[11px] text-white/70 mt-1">{data.balance < 0 ? 'Overspent' : 'Surplus'}</p>
        </div>

        {/* Daily Avg */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Daily Avg</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
            {currencySymbol}{data.avgDailySpend.toLocaleString()}
          </p>
          {data.isViewingCurrentMonth && data.projectedMonthEnd > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              ~{currencySymbol}{data.projectedMonthEnd.toLocaleString()} projected
            </p>
          )}
        </div>
      </div>

      {/* ─── 3. BALANCE CARDS ─── */}
      <BalanceCards refreshTrigger={refreshTrigger} userName={userName} />

      {/* ─── 4. MAIN 2-COLUMN GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Charts column (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Spending This Month */}
          <Card className="shadow-sm border-gray-100 dark:border-gray-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Spending This Month</CardTitle>
                {data.avgVsCurrentLineData.length > 0 && data.averageMonthlyExpense > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Current
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-slate-400" /> Avg
                    </span>
                  </div>
                )}
                {(data.avgVsCurrentLineData.length === 0 || data.averageMonthlyExpense === 0) && trendData.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Income
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Expense
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data.avgVsCurrentLineData.length > 0 && data.averageMonthlyExpense > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.avgVsCurrentLineData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="day"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `${v}`}
                        ticks={[1, 5, 10, 15, 20, 25, 30]}
                      />
                      <YAxis
                        tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name === 'current' ? 'Current' : 'Average']}
                        labelFormatter={(label: number) => `Day ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="average"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={false}
                        name="average"
                        activeDot={{ r: 3, fill: '#94a3b8' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="current"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={false}
                        name="current"
                        activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : trendData.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Income" />
                      <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2} name="Expense" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                  No trend data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Spending by Day */}
          {data.totalExpense > 0 && data.dayOfWeekSpending.some(d => d.amount > 0) && (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Spending by Day</CardTitle>
                  {data.weekendTotal > 0 && data.weekdayTotal > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Weekday {currencySymbol}{data.weekdayTotal.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Weekend {currencySymbol}{data.weekendTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dayOfWeekSpending} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number) => [`${currencySymbol}${value.toLocaleString()}`, 'Spent']} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {data.dayOfWeekSpending.map((entry, index) => (
                          <Cell
                            key={`dow-${index}`}
                            fill={index === 0 || index === 6 ? '#f59e0b' : '#6366f1'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Breakdown column (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Spending Breakdown (donut + legend) */}
          {classificationData.length > 0 && (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Spending Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  {/* Donut */}
                  <div className="h-44 w-36 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={classificationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {classificationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {classificationData.map((entry) => {
                      const total = classificationData.reduce((s, e) => s + e.value, 0)
                      const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0
                      return (
                        <div key={entry.name} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 min-w-0 truncate">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                            {entry.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 dark:text-white flex-shrink-0">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Mini 3-stat row */}
                <div className="mt-3 grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Needs</p>
                    <p className="text-sm font-bold text-emerald-600">{needPercent}%</p>
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Wants</p>
                    <p className="text-sm font-bold text-amber-600">{wantPercent}%</p>
                  </div>
                  <div className="px-3 py-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Luxury</p>
                    <p className="text-sm font-bold text-rose-600">{egoPercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 2: Where Money Goes (top 5 progress bars) */}
          {top5Categories.length > 0 && (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Where Money Goes</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2.5">
                  {top5Categories.map(([name, amount], i) => {
                    const pct = top5Max > 0 ? Math.round((amount / top5Max) * 100) : 0
                    const totalExp = data.totalExpense || 1
                    const sharePct = Math.round((amount / totalExp) * 100)
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[55%]">{name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{currencySymbol}{amount.toLocaleString()} <span className="text-gray-400">·</span> {sharePct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: TOP5_COLORS[i] }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Card 3: Biggest Expenses */}
          {data.topTransactions.length > 0 && (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Biggest Expenses</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {data.topTransactions.slice(0, 4).map((txn, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{txn.description}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {txn.category} · {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">
                        {currencySymbol}{txn.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── 5. SMART INSIGHTS ─── */}
      {data.smartInsights.length > 0 && (
        <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20 dark:from-emerald-950/20 dark:via-gray-900 dark:to-teal-950/10">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.smartInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/70 dark:bg-gray-800/40 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-snug">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 6. SECONDARY ANALYTICS (side by side) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: 50/30/20 Rule */}
        {classificationData.length > 0 && (
          <Card className="shadow-sm border-gray-100 dark:border-gray-800">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">50/30/20 Rule</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Needs
                    </span>
                    <span className="font-semibold">{needPercent}%</span>
                  </div>
                  <Progress value={Math.min(needPercent, 100)} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Wants
                    </span>
                    <span className="font-semibold">{wantPercent}%</span>
                  </div>
                  <Progress value={Math.min(wantPercent, 100)} className="h-2 [&>div]:bg-amber-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Luxury
                    </span>
                    <span className="font-semibold">{egoPercent}%</span>
                  </div>
                  <Progress value={Math.min(egoPercent, 100)} className="h-2 [&>div]:bg-rose-500" />
                </div>
                {(data.classificationBreakdown.savings > 0 || data.classificationBreakdown.debt > 0) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1 border-t border-gray-100 dark:border-gray-800">
                    {data.classificationBreakdown.savings > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Savings: {currencySymbol}{data.classificationBreakdown.savings.toLocaleString()}
                      </span>
                    )}
                    {data.classificationBreakdown.debt > 0 && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Debt: {currencySymbol}{data.classificationBreakdown.debt.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Right: vs Your Average */}
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">vs Your Average</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.averageMonthlyExpense > 0 && classificationComparison.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classificationComparison} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="current" fill="#10b981" name="This Month" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : trendData.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} strokeWidth={2} name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-center text-muted-foreground">
                <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">Track 2+ months to compare</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── 7. YEARLY COMPARISON ─── */}
      {data.yearlyComparison.length > 0 && (
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                Yearly Comparison
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={yearlyView === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-xs px-2 ${yearlyView === 'overview' ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' : ''}`}
                  onClick={() => setYearlyView('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={yearlyView === 'yearly' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-xs px-2 ${yearlyView === 'yearly' ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' : ''}`}
                  onClick={() => setYearlyView('yearly')}
                >
                  Chart
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {yearlyView === 'overview' ? (
              <div className="space-y-2">
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 border border-violet-200 dark:border-violet-900/40">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                        <BarChart3 className="w-3 h-3 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs text-violet-600 font-medium">All-Time Average</p>
                        <p className="text-sm font-bold text-violet-900 dark:text-violet-300">{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}<span className="text-xs font-normal text-violet-600">/mo</span></p>
                      </div>
                      <div className="ml-auto text-xs text-violet-600">{data.allTimeMonths} months</div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {data.yearlyComparison.map((year) => {
                    const isCurrentYear = year.label.includes('Current')
                    return (
                      <div key={year.year} className={`rounded-lg p-3 border ${isCurrentYear ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{year.year}</span>
                            {isCurrentYear && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1 py-0">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isCurrentYear && data.yearlyComparison.length > 1 && (() => {
                              const prevYear = data.yearlyComparison.find(y => y.year === year.year - 1)
                              if (prevYear && prevYear.avgMonthlyExpense > 0) {
                                const yearChange = ((year.avgMonthlyExpense - prevYear.avgMonthlyExpense) / prevYear.avgMonthlyExpense) * 100
                                return (
                                  <Badge className={`text-[10px] px-1 py-0 ${yearChange > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {yearChange > 0 ? <ArrowUpRight className="w-2.5 h-2.5 inline" /> : <ArrowDownRight className="w-2.5 h-2.5 inline" />}
                                    {yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%
                                  </Badge>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Avg/mo</p>
                            <p className="text-xs font-bold">{currencySymbol}{year.avgMonthlyExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Expense</p>
                            <p className="text-xs font-bold">{currencySymbol}{year.totalExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Income</p>
                            <p className="text-xs font-bold text-emerald-700">{currencySymbol}{year.totalIncome.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyChartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="year" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name === 'avgMonthly' ? 'Avg Monthly' : 'Total Expense']} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="avgMonthly" fill="#8b5cf6" name="Avg Monthly" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="totalExpense" fill="#c4b5fd" name="Total Expense" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <div className="w-4 h-0.5 bg-violet-600" />
                    <span>All-time Avg: <strong>{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}/mo</strong></span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── 8. PAYMENT METHODS + ALERTS + SPENDING PSYCHOLOGY ─── */}
      {Object.keys(data.spendingTypeBreakdown).length > 0 && (
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.spendingTypeBreakdown).map(([type, amount]) => (
                <div key={type} className="flex items-center gap-2 bg-muted dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    {type === 'cash' ? '💵' : type === 'debit' ? '💳' : type === 'mobile' ? '📱' : '💳'}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{type}</span>
                  <span className="text-xs font-bold">{currencySymbol}{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {(() => {
        const stats = data.spendingTypeStats
        const activeTypes = (['cash', 'debit', 'credit', 'mobile'] as const).filter(
          (type) => stats[type].count > 0
        )

        if (activeTypes.length === 0) return null

        if (activeTypes.length === 1) {
          return (
            <Card className="shadow-sm border-gray-100 dark:border-gray-800 border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/50 to-white">
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold mb-1">Spending Psychology</h3>
                <p className="text-sm text-muted-foreground">
                  Add transactions with different payment methods to unlock behavioral insights
                </p>
              </CardContent>
            </Card>
          )
        }

        let maxAvgType = activeTypes[0]
        let minAvgType = activeTypes[0]
        activeTypes.forEach((type) => {
          if (stats[type].avgPerTxn > stats[maxAvgType].avgPerTxn) maxAvgType = type
          if (stats[type].avgPerTxn < stats[minAvgType].avgPerTxn) minAvgType = type
        })

        const percentMore =
          stats[minAvgType].avgPerTxn > 0
            ? Math.round(
                ((stats[maxAvgType].avgPerTxn - stats[minAvgType].avgPerTxn) /
                  stats[minAvgType].avgPerTxn) *
                  100
              )
            : 0

        const PAYMENT_COLORS: Record<string, string> = {
          cash: '#10b981',
          debit: '#3b82f6',
          credit: '#f59e0b',
          mobile: '#8b5cf6',
        }
        const PAYMENT_LABELS: Record<string, string> = {
          cash: 'Cash',
          debit: 'Debit',
          credit: 'Credit Card',
          mobile: 'Mobile',
        }
        const PAYMENT_ICONS: Record<string, string> = {
          cash: '💵',
          debit: '💳',
          credit: '💳',
          mobile: '📱',
        }

        const maxAvgForScale = Math.max(...activeTypes.map((t) => stats[t].avgPerTxn), 1)

        return (
          <Card className="shadow-sm border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20 dark:from-amber-950/10 dark:via-gray-900">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-amber-600" />
                </div>
                Spending Psychology
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {percentMore > 0 && maxAvgType !== minAvgType && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800/40">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        You spend {percentMore}% more per transaction on {PAYMENT_LABELS[maxAvgType]} vs {PAYMENT_LABELS[minAvgType]}
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Avg {PAYMENT_LABELS[maxAvgType]}: {currencySymbol}{stats[maxAvgType].avgPerTxn.toLocaleString()} vs {PAYMENT_LABELS[minAvgType]}: {currencySymbol}{stats[minAvgType].avgPerTxn.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {activeTypes
                  .sort((a, b) => stats[b].avgPerTxn - stats[a].avgPerTxn)
                  .map((type) => {
                    const barWidth = Math.max((stats[type].avgPerTxn / maxAvgForScale) * 100, 4)
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>{PAYMENT_ICONS[type]}</span>
                            {PAYMENT_LABELS[type]}
                            <span className="text-muted-foreground font-normal">({stats[type].count} txn{stats[type].count !== 1 ? 's' : ''})</span>
                          </span>
                          <span className="font-bold" style={{ color: PAYMENT_COLORS[type] }}>
                            {currencySymbol}{stats[type].avgPerTxn.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%`, backgroundColor: PAYMENT_COLORS[type] }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {activeTypes.map((type) => (
                  <div
                    key={type}
                    className="rounded-lg p-3 border"
                    style={{
                      backgroundColor: `${PAYMENT_COLORS[type]}08`,
                      borderColor: `${PAYMENT_COLORS[type]}30`,
                    }}
                  >
                    <p className="text-xs font-medium uppercase tracking-wide" style={{ color: PAYMENT_COLORS[type] }}>
                      {PAYMENT_ICONS[type]} {PAYMENT_LABELS[type]}
                    </p>
                    <p className="text-sm font-bold mt-0.5">{currencySymbol}{stats[type].total.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">avg {currencySymbol}{stats[type].avgPerTxn.toLocaleString()}/txn</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* ─── 9. CATEGORY vs AVERAGE ─── */}
      {categoryComparison.length > 0 && data.averageMonthlyExpense > 0 && (
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Category vs Average</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparison} layout="vertical" margin={{ left: 5, right: 5, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={80} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="current" fill="#10b981" name="Current" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data.totalExpense === 0 && data.totalIncome === 0 && (
        <Card className="border-dashed shadow-sm border-gray-100 dark:border-gray-800">
          <CardContent className="p-6 text-center">
            <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">No Transactions Yet</h3>
            <p className="text-muted-foreground text-xs">
              Start by adding your first expense or income using voice or text input!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
