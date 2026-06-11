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
  Sparkles, CalendarDays, Receipt, Gauge, Flame,
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

export default function Dashboard({ refreshTrigger, userName }: DashboardProps) {
  const { currencySymbol } = useCurrency()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [yearlyView, setYearlyView] = useState<'overview' | 'yearly'>('overview')

  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <div className="space-y-4">
      {/* Row 1: Month Navigation Header */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 via-emerald-950 to-slate-900 text-white shadow-xl shadow-emerald-900/20 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase mb-0.5">
                {data.monthName.includes(' ') ? data.monthName.split(' ')[1] : new Date().getFullYear()}
              </p>
              <h2 className="text-4xl font-bold tracking-tight leading-none">
                {data.monthShortName || data.monthName.split(' ')[0]}
              </h2>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 mt-1.5 transition-colors"
                >
                  ← Back to current
                </button>
              )}
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {isCurrentMonth && data.daysInMonth > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-white/35 mb-1.5">
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

      {/* Row 2: Balance Cards - Cash, Debit, Credit */}
      <BalanceCards refreshTrigger={refreshTrigger} userName={userName} />

      {/* Row 3: Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Income</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{currencySymbol}{data.totalIncome.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Expenses</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
          {data.averageMonthlyExpense > 0 && (
            <p className={`text-[11px] mt-1 font-medium ${diffFromAvg > 10 ? 'text-red-500' : diffFromAvg < -10 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {diffFromAvg > 0 ? '↑' : '↓'} {Math.abs(diffFromAvg).toFixed(0)}% vs avg
            </p>
          )}
        </div>

        <div className={`rounded-2xl p-4 shadow-sm ${data.balance >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-red-500 to-rose-500'}`}>
          <div className="flex items-center gap-2 mb-2.5">
            <Wallet className="w-4 h-4 text-white/70" />
            <span className="text-xs text-white/70 font-medium">Net Balance</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-white leading-none">{currencySymbol}{Math.abs(data.balance).toLocaleString()}</p>
          <p className="text-[11px] text-white/60 mt-1">{data.balance < 0 ? 'Overspent' : 'Surplus this month'}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Savings Rate</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
            {data.totalIncome > 0
              ? `${Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)}%`
              : '—'}
          </p>
        </div>
      </div>

      {/* Row 3b: Smart Insights — plain-English highlights */}
      {data.smartInsights.length > 0 && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-gray-900 dark:to-teal-950/10 dark:border-emerald-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              Smart Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.smartInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 dark:bg-gray-800/40 rounded-lg p-3 border border-emerald-100 dark:border-emerald-900/30">
                  <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 3c: Spending Pace key metrics */}
      {data.totalExpense > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Gauge className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Daily Avg</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{currencySymbol}{data.avgDailySpend.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{data.daysElapsed} day{data.daysElapsed !== 1 ? 's' : ''}</p>
          </div>

          {data.isViewingCurrentMonth && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-violet-600" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Projected</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{currencySymbol}{data.projectedMonthEnd.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">by month end</p>
            </div>
          )}

          {data.biggestDay && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                  <Flame className="w-3 h-3 text-orange-600" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">Biggest Day</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{currencySymbol}{data.biggestDay.amount.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(data.biggestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                <Receipt className="w-3 h-3 text-teal-600" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">Transactions</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white leading-none">{data.transactionCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">this month</p>
          </div>
        </div>
      )}

      {/* Row 4: Average vs Current Month Line Chart - FULL WIDTH */}
      {data.avgVsCurrentLineData.length > 0 && data.averageMonthlyExpense > 0 ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Average vs Current Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.avgVsCurrentLineData}
                  margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    fontSize={12}
                    tickFormatter={(v: number) => `${v}`}
                    ticks={[1, 5, 10, 15, 20, 25, 30]}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    labelFormatter={(label: number) => `Day ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(value: string) => (
                      <span className="text-sm font-medium">{value === 'current' ? 'Current Month' : 'Average Habit'}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#94a3b8"
                    strokeWidth={2.5}
                    strokeDasharray="8 4"
                    dot={false}
                    name="average"
                    activeDot={{ r: 4, fill: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                    name="current"
                    activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : data.totalExpense > 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
            <h3 className="text-sm font-semibold mb-0.5">Average vs Current Month</h3>
            <p className="text-muted-foreground text-sm">
              Keep tracking for 2+ months to unlock the average expense comparison chart.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Row 5: Pie Chart (LEFT) | Where Money Goes (RIGHT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {classificationData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {classificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {classificationData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {categoryData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where Money Goes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={12} />
                    <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 5b: Day-of-week pattern (LEFT) | Top transactions (RIGHT) */}
      {data.totalExpense > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {data.dayOfWeekSpending.some(d => d.amount > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-500" />
                  Spending by Day of Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dayOfWeekSpending} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" fontSize={12} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={12} />
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
                {data.weekendTotal > 0 && data.weekdayTotal > 0 && (
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Weekday {currencySymbol}{data.weekdayTotal.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Weekend {currencySymbol}{data.weekendTotal.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {data.topTransactions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-rose-500" />
                  Biggest Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.topTransactions.map((txn, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {txn.category} · {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white flex-shrink-0">
                        {currencySymbol}{txn.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Row 6: 50/30/20 Rule Breakdown - Full Width */}
      {classificationData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">50/30/20 Rule Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    Needs (50%)
                  </span>
                  <span className="font-medium">{needPercent}%</span>
                </div>
                <Progress value={Math.min(needPercent, 100)} className="h-2.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    Wants (30%)
                  </span>
                  <span className="font-medium">{wantPercent}%</span>
                </div>
                <Progress value={Math.min(wantPercent, 100)} className="h-2.5 [&>div]:bg-amber-500" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    Ego/Luxury
                  </span>
                  <span className="font-medium">{egoPercent}%</span>
                </div>
                <Progress value={Math.min(egoPercent, 100)} className="h-2.5 [&>div]:bg-red-500" />
              </div>
              {(data.classificationBreakdown.savings > 0 || data.classificationBreakdown.debt > 0) && (
                <div className="flex gap-4 text-sm text-muted-foreground pt-1">
                  {data.classificationBreakdown.savings > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-sky-500" />
                      Savings: {currencySymbol}{data.classificationBreakdown.savings.toLocaleString()}
                    </span>
                  )}
                  {data.classificationBreakdown.debt > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-500" />
                      Debt: {currencySymbol}{data.classificationBreakdown.debt.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 7: Income vs Expense Trend (LEFT) | Classification Current vs Average (RIGHT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {trendData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Income vs Expense Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={12} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Income" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {data.averageMonthlyExpense > 0 && classificationComparison.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                Classification: Current vs Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classificationComparison} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={12} />
                    <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="average" fill="#94a3b8" name="Avg Monthly" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" fill="#10b981" name="This Month" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Row 8: Yearly Average Comparison - FULL WIDTH */}
      {data.yearlyComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
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
          <CardContent>
            {yearlyView === 'overview' ? (
              <div className="space-y-2">
                {/* All-time Average */}
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-3 h-3 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-violet-600 font-medium">All-Time Average</p>
                        <p className="text-base font-bold text-violet-900">{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}<span className="text-sm font-normal text-violet-600">/mo</span></p>
                      </div>
                      <div className="ml-auto text-sm text-violet-600">
                        {data.allTimeMonths} months
                      </div>
                    </div>
                  </div>
                )}

                {/* Year by Year Cards */}
                <div className="space-y-2">
                  {data.yearlyComparison.map((year) => {
                    const isCurrentYear = year.label.includes('Current')
                    return (
                      <div key={year.year} className={`rounded-md p-4 border ${isCurrentYear ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{year.year}</span>
                            {isCurrentYear && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] px-1 py-0">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            {isCurrentYear ? (
                              data.yearlyComparison.length > 1 ? (
                                (() => {
                                  const prevYear = data.yearlyComparison.find(y => y.year === year.year - 1)
                                  if (prevYear && prevYear.avgMonthlyExpense > 0) {
                                    const yearChange = ((year.avgMonthlyExpense - prevYear.avgMonthlyExpense) / prevYear.avgMonthlyExpense) * 100
                                    return (
                                      <Badge className={`text-[10px] px-1 py-0 ${yearChange > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {yearChange > 0 ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                                        {yearChange > 0 ? '+' : ''}{yearChange.toFixed(1)}%
                                      </Badge>
                                    )
                                  }
                                  return null
                                })()
                              ) : null
                            ) : (
                              (() => {
                                const nextYear = data.yearlyComparison.find(y => y.year === year.year + 1)
                                if (nextYear && year.avgMonthlyExpense > 0) {
                                  return null
                                }
                                return null
                              })()
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Avg/mo</p>
                            <p className="font-bold">{currencySymbol}{year.avgMonthlyExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Expense</p>
                            <p className="font-bold">{currencySymbol}{year.totalExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Income</p>
                            <p className="font-bold text-emerald-700">{currencySymbol}{year.totalIncome.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Yearly Chart View */
              <div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearlyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" fontSize={12} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={12} />
                      <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name === 'avgMonthly' ? 'Avg Monthly Expense' : 'Total Expense']} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="avgMonthly" fill="#8b5cf6" name="Avg Monthly" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalExpense" fill="#c4b5fd" name="Total Expense" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-0.5 bg-violet-600" />
                    <span>All-time Avg: <strong>{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}/mo</strong></span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Row 9: Payment Method Breakdown */}
      {Object.keys(data.spendingTypeBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.spendingTypeBreakdown).map(([type, amount]) => (
                <div key={type} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                  <span className="text-sm">
                    {type === 'cash' ? '💵' : type === 'debit' ? '💳' : type === 'mobile' ? '📱' : '💳'}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize">{type}</span>
                  <span className="font-bold text-sm">{currencySymbol}{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 10: Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <Alert key={i} variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Row 11: Category Comparison Current vs Average */}
      {categoryComparison.length > 0 && data.averageMonthlyExpense > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category: Current vs Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparison} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={12} />
                  <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="current" fill="#10b981" name="Current" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 12: Spending Psychology */}
      {(() => {
        const stats = data.spendingTypeStats
        const activeTypes = (['cash', 'debit', 'credit', 'mobile'] as const).filter(
          (type) => stats[type].count > 0
        )

        if (activeTypes.length === 0) return null

        if (activeTypes.length === 1) {
          return (
            <Card className="border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/50 to-white">
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

        // Find the highest and lowest avg per transaction
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

        const barData = activeTypes.map((type) => ({
          name: PAYMENT_LABELS[type],
          avgPerTxn: stats[type].avgPerTxn,
          fill: PAYMENT_COLORS[type],
        }))

        const maxAvgForScale = Math.max(...activeTypes.map((t) => stats[t].avgPerTxn), 1)

        return (
          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-amber-600" />
                </div>
                Spending Psychology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Key Insight */}
              {percentMore > 0 && maxAvgType !== minAvgType && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        You spend {percentMore}% more per transaction on {PAYMENT_LABELS[maxAvgType]} vs {PAYMENT_LABELS[minAvgType]}
                      </p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        Avg {PAYMENT_LABELS[maxAvgType]}: {currencySymbol}{stats[maxAvgType].avgPerTxn.toLocaleString()} vs {PAYMENT_LABELS[minAvgType]}: {currencySymbol}{stats[minAvgType].avgPerTxn.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Comparison Bars */}
              <div className="space-y-2">
                {activeTypes
                  .sort((a, b) => stats[b].avgPerTxn - stats[a].avgPerTxn)
                  .map((type) => {
                    const barWidth = Math.max(
                      (stats[type].avgPerTxn / maxAvgForScale) * 100,
                      4
                    )
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="text-sm">{PAYMENT_ICONS[type]}</span>
                            {PAYMENT_LABELS[type]}
                            <span className="text-sm text-muted-foreground font-normal">
                              ({stats[type].count} txn{stats[type].count !== 1 ? 's' : ''})
                            </span>
                          </span>
                          <span className="font-bold text-sm" style={{ color: PAYMENT_COLORS[type] }}>
                            {currencySymbol}{stats[type].avgPerTxn.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: PAYMENT_COLORS[type],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Summary Stats grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {activeTypes.map((type) => (
                  <div
                    key={type}
                    className="rounded-md p-4 border"
                    style={{
                      backgroundColor: `${PAYMENT_COLORS[type]}08`,
                      borderColor: `${PAYMENT_COLORS[type]}30`,
                    }}
                  >
                    <p className="text-sm font-medium uppercase tracking-wide" style={{ color: PAYMENT_COLORS[type] }}>
                      {PAYMENT_ICONS[type]} {PAYMENT_LABELS[type]}
                    </p>
                    <p className="text-sm font-bold mt-0.5">
                      {currencySymbol}{stats[type].total.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      avg {currencySymbol}{stats[type].avgPerTxn.toLocaleString()}/txn
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Empty State */}
      {data.totalExpense === 0 && data.totalIncome === 0 && (
        <Card className="border-dashed">
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
