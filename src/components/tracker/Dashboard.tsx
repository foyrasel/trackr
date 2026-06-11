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

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
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
      {/* Month Navigation Header */}
      <Card className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <Calendar className="w-4 h-4 opacity-80" />
                <h2 className="text-lg font-bold">{data.monthName}</h2>
              </div>
              {!isCurrentMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="text-sm text-white/70 hover:text-white hover:bg-white/10 mt-0.5 h-6 px-2"
                >
                  Back to Current Month
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Cards - Cash, Debit, Credit */}
      <BalanceCards refreshTrigger={refreshTrigger} userName={userName} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Income</span>
            </div>
            <p className="text-xl font-bold text-emerald-900">{currencySymbol}{data.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">Expense</span>
            </div>
            <p className="text-xl font-bold text-red-900">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${data.balance >= 0 ? 'from-emerald-50 to-emerald-100/50 border-emerald-200' : 'from-red-50 to-red-100/50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-sm font-medium">Net Balance</span>
            </div>
            <p className={`text-xl font-bold ${data.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {currencySymbol}{data.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Savings Rate</span>
            </div>
            <p className="text-xl font-bold text-amber-900">
              {data.totalIncome > 0
                ? `${Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)}%`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Average vs Current Expense - Key Metric */}
      {data.averageMonthlyExpense > 0 && (
        <Card className={`border-2 ${diffFromAvg > 10 ? 'border-red-300 bg-gradient-to-br from-red-50 to-white' : diffFromAvg < -10 ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  diffFromAvg > 10 ? 'bg-red-100 text-red-600' : diffFromAvg < -10 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{data.monthShortName} vs Average Habit</p>
                  <p className="text-lg font-bold">
                    {currencySymbol}{data.totalExpense.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground mx-1">vs</span>
                    <span className="text-sm">{currencySymbol}{Math.round(data.averageMonthlyExpense).toLocaleString()} avg</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`text-sm px-3 py-1 ${
                  diffFromAvg > 10
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : diffFromAvg < -10
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {diffFromAvg > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {diffFromAvg > 0 ? '+' : ''}{diffFromAvg.toFixed(1)}%
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {diffFromAvg > 10 ? 'Spending too much!' : diffFromAvg < -10 ? 'Great savings!' : 'On track'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== AVERAGE VS CURRENT MONTH LINE CHART (like user's picture) ====== */}
      {data.avgVsCurrentLineData.length > 0 && data.averageMonthlyExpense > 0 ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Average vs Current Month
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track your spending pace against your average monthly habit
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.avgVsCurrentLineData}
                  margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    fontSize={14}
                    tickFormatter={(v: number) => `${v}`}
                    label={{ value: 'Date of Month', position: 'insideBottom', offset: -2, fontSize: 14, fill: '#6b7280' }}
                    ticks={[1, 5, 10, 15, 20, 25, 30]}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                    fontSize={14}
                    label={{ value: 'Expense', angle: -90, position: 'insideLeft', offset: 10, fontSize: 14, fill: '#6b7280' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]}
                    labelFormatter={(label: number) => `Day ${label}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-sm font-medium">{value === 'current' ? 'Current Month' : 'Average Monthly Habit'}</span>
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
            {/* Legend explanation below chart */}
            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-emerald-500 rounded" />
                <span className="text-muted-foreground">Current Month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-slate-400" />
                <span className="text-muted-foreground">Avg Monthly Habit</span>
              </div>
            </div>
            {/* Summary below chart */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                <p className="text-sm text-emerald-600 font-medium">Current Month</p>
                <p className="text-sm font-bold text-emerald-900">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
                <p className="text-sm text-emerald-600">
                  {isCurrentMonth ? `Day ${currentDayOfMonth} of ${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()}` : `Full Month`}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                <p className="text-sm text-slate-600 font-medium">Average Habit</p>
                <p className="text-sm font-bold text-slate-900">{currencySymbol}{Math.round(data.averageMonthlyExpense).toLocaleString()}</p>
                <p className="text-sm text-slate-500">Per month average</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : data.totalExpense > 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-6 text-center">
            <Activity className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">Average vs Current Month</h3>
            <p className="text-muted-foreground text-sm">
              Keep tracking for 2+ months to unlock the average expense comparison chart.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ====== YEARLY AVERAGE COMPARISON ====== */}
      {data.yearlyComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-violet-500" />
                Yearly Average Comparison
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant={yearlyView === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-sm px-2.5 ${yearlyView === 'overview' ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' : ''}`}
                  onClick={() => setYearlyView('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={yearlyView === 'yearly' ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-7 text-sm px-2.5 ${yearlyView === 'yearly' ? 'bg-violet-100 text-violet-800 hover:bg-violet-200' : ''}`}
                  onClick={() => setYearlyView('yearly')}
                >
                  Yearly Chart
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {yearlyView === 'overview' ? (
              <div className="space-y-3">
                {/* All-time Average */}
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-violet-600 font-medium">All-Time Average</p>
                        <p className="text-lg font-bold text-violet-900">{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}<span className="text-sm font-normal text-violet-600">/month</span></p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm text-violet-600">
                      <span>Total Expense: {currencySymbol}{data.allTimeTotalExpense.toLocaleString()}</span>
                      <span>Over {data.allTimeMonths} months</span>
                    </div>
                  </div>
                )}

                {/* Year by Year Cards */}
                <div className="space-y-2">
                  {data.yearlyComparison.map((year) => {
                    const isCurrentYear = year.label.includes('Current')
                    return (
                      <div key={year.year} className={`rounded-lg p-4 border ${isCurrentYear ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{year.year}</span>
                            {isCurrentYear && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-1.5 py-0">Current</Badge>
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
                                      <Badge className={`text-xs px-1.5 py-0 ${yearChange > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                            <p className="text-muted-foreground">Avg Monthly</p>
                            <p className="font-bold">{currencySymbol}{year.avgMonthlyExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Expense</p>
                            <p className="font-bold">{currencySymbol}{year.totalExpense.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Income</p>
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
                      <XAxis dataKey="year" fontSize={14} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={14} />
                      <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name === 'avgMonthly' ? 'Avg Monthly Expense' : 'Total Expense']} />
                      <Legend />
                      <Bar dataKey="avgMonthly" fill="#8b5cf6" name="Avg Monthly" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalExpense" fill="#c4b5fd" name="Total Expense" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* All-time line */}
                {data.allTimeAvgMonthlyExpense > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-0.5 bg-violet-600" />
                    <span>All-time Average: <strong>{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}/month</strong></span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
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

      {/* 50/30/20 Rule Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">50/30/20 Rule Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Needs (Target: 50%)
              </span>
              <span className="font-medium">{currencySymbol}{data.classificationBreakdown.need.toLocaleString()} ({needPercent}%)</span>
            </div>
            <Progress value={Math.min(needPercent, 100)} className="h-2.5" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Wants (Target: 30%)
              </span>
              <span className="font-medium">{currencySymbol}{data.classificationBreakdown.want.toLocaleString()} ({wantPercent}%)</span>
            </div>
            <Progress value={Math.min(wantPercent, 100)} className="h-2.5 [&>div]:bg-amber-500" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Ego/Luxury
              </span>
              <span className="font-medium">{currencySymbol}{data.classificationBreakdown.ego.toLocaleString()} ({egoPercent}%)</span>
            </div>
            <Progress value={Math.min(egoPercent, 100)} className="h-2.5 [&>div]:bg-red-500" />
          </div>

          {data.classificationBreakdown.savings > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span>Savings: {currencySymbol}{data.classificationBreakdown.savings.toLocaleString()}</span>
            </div>
          )}

          {data.classificationBreakdown.debt > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Debt: {currencySymbol}{data.classificationBreakdown.debt.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classification: Current vs Average Bar Chart */}
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
                  <XAxis dataKey="name" fontSize={14} />
                  <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={14} />
                  <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="average" fill="#94a3b8" name="Avg Monthly" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" fill="#10b981" name="This Month" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span>Avg Monthly Expense: <strong>{currencySymbol}{Math.round(data.averageMonthlyExpense).toLocaleString()}</strong></span>
              <span>Current: <strong>{currencySymbol}{data.totalExpense.toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Comparison: Current vs Average */}
      {categoryComparison.length > 0 && data.averageMonthlyExpense > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Category: Current vs Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparison} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={14} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={14} />
                  <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="current" fill="#10b981" name="Current" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classificationData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classificationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
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
                  <div key={entry.name} className="flex items-center gap-1 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
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
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={14} />
                    <YAxis type="category" dataKey="name" width={90} fontSize={14} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Income vs Expense Trend */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income vs Expense Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={14} />
                  <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={14} />
                  <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                  <Legend />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Income" />
                  <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Breakdown */}
      {Object.keys(data.spendingTypeBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.spendingTypeBreakdown).map(([type, amount]) => (
                <div key={type} className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                  <span className="text-lg">
                    {type === 'cash' ? '💵' : type === 'debit' ? '💳' : type === 'mobile' ? '📱' : '💳'}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground capitalize">{type}</p>
                    <p className="font-bold text-sm">{currencySymbol}{amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spending Psychology - Behavioral Insights */}
      {(() => {
        const stats = data.spendingTypeStats
        const activeTypes = (['cash', 'debit', 'credit', 'mobile'] as const).filter(
          (type) => stats[type].count > 0
        )

        if (activeTypes.length === 0) return null

        if (activeTypes.length === 1) {
          return (
            <Card className="border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/50 to-white">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-1.5">Spending Psychology</h3>
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
              <p className="text-sm text-muted-foreground mt-0.5">
                How your payment method affects spending behavior
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Key Insight */}
              {percentMore > 0 && maxAvgType !== minAvgType && (
                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        You spend {percentMore}% more per transaction on {PAYMENT_LABELS[maxAvgType]} vs {PAYMENT_LABELS[minAvgType]}
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Average {PAYMENT_LABELS[maxAvgType]} transaction: {currencySymbol}{stats[maxAvgType].avgPerTxn.toLocaleString()} vs {PAYMENT_LABELS[minAvgType]}: {currencySymbol}{stats[minAvgType].avgPerTxn.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Comparison Bars */}
              <div className="space-y-3">
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
                          <span className="font-bold" style={{ color: PAYMENT_COLORS[type] }}>
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

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {activeTypes.map((type) => (
                  <div
                    key={type}
                    className="rounded-lg p-4 border"
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
                    <p className="text-sm text-muted-foreground">
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
          <CardContent className="p-8 text-center">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">No Transactions Yet</h3>
            <p className="text-muted-foreground text-sm">
              Start by adding your first expense or income using voice or text input!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
