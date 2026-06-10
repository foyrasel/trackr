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
  LineChart, Line, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  PiggyBank, BarChart3, Calendar, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Activity, ChevronDown,
} from 'lucide-react'
import BalanceCards from './BalanceCards'
import { Button } from '@/components/ui/button'
import { useCurrency } from './CurrencyContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  avgVsCurrentLineData2Y?: { day: number; average: number }[]
  avgVsCurrentLineDataAll?: { day: number; average: number }[]
  availableCategories?: string[]
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

export default function Dashboard({ refreshTrigger, userName }: DashboardProps) {
  const { currencySymbol } = useCurrency()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [showYearly, setShowYearly] = useState(false)

  // Feature 2: Chart enhancement states
  const [avg1Y, setAvg1Y] = useState(true)
  const [avg2Y, setAvg2Y] = useState(false)
  const [avgAll, setAvgAll] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedMonth) params.set('month', selectedMonth)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      const url = `/api/analytics${params.toString() ? `?${params.toString()}` : ''}`
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
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
  }, [selectedMonth, userName, selectedCategory])

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
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-6 bg-muted rounded w-1/2" />
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
        <CardContent className="p-3 text-center text-muted-foreground">
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
    { name: 'Needs', current: data.classificationBreakdown.need, average: Math.round(data.avgClassificationBreakdown.need) },
    { name: 'Wants', current: data.classificationBreakdown.want, average: Math.round(data.avgClassificationBreakdown.want) },
    { name: 'Ego', current: data.classificationBreakdown.ego, average: Math.round(data.avgClassificationBreakdown.ego) },
    { name: 'Savings', current: data.classificationBreakdown.savings, average: Math.round(data.avgClassificationBreakdown.savings) },
    { name: 'Debt', current: data.classificationBreakdown.debt, average: Math.round(data.avgClassificationBreakdown.debt) },
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

  // Build enhanced chart data with multi-period averages
  const chartData = data.avgVsCurrentLineData.map((item, idx) => {
    const entry: Record<string, number> = { day: item.day, current: item.current, average1Y: item.average }
    if (data.avgVsCurrentLineData2Y && data.avgVsCurrentLineData2Y[idx]) {
      entry.average2Y = data.avgVsCurrentLineData2Y[idx].average
    }
    if (data.avgVsCurrentLineDataAll && data.avgVsCurrentLineDataAll[idx]) {
      entry.averageAll = data.avgVsCurrentLineDataAll[idx].average
    }
    return entry
  })

  // For current month, truncate current line at today
  const displayChartData = isCurrentMonth
    ? chartData.map((item) => ({
        ...item,
        current: item.day <= currentDayOfMonth ? item.current : undefined as unknown as number,
      }))
    : chartData

  return (
    <div className="space-y-3">
      {/* Row 1: Month Navigation Header - Compact */}
      <Card className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white border-0 shadow-lg">
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <Calendar className="w-3.5 h-3.5 opacity-80" />
                <h2 className="text-base font-bold">{data.monthName}</h2>
              </div>
              {!isCurrentMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="text-[10px] text-white/70 hover:text-white hover:bg-white/10 mt-0 h-5 px-1.5"
                >
                  Back to Current
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Balance Cards - More compact */}
      <BalanceCards refreshTrigger={refreshTrigger} userName={userName} />

      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] text-emerald-700 font-medium">Income</span>
            </div>
            <p className="text-lg font-bold text-emerald-900">{currencySymbol}{data.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              <span className="text-[10px] text-red-700 font-medium">Expense</span>
            </div>
            <p className="text-lg font-bold text-red-900">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${data.balance >= 0 ? 'from-emerald-50 to-emerald-100/50 border-emerald-200' : 'from-red-50 to-red-100/50 border-red-200'}`}>
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Wallet className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium">Net Balance</span>
            </div>
            <p className={`text-lg font-bold ${data.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              {currencySymbol}{data.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <PiggyBank className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] text-amber-700 font-medium">Savings Rate</span>
            </div>
            <p className="text-lg font-bold text-amber-900">
              {data.totalIncome > 0
                ? `${Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100)}%`
                : '0%'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Average vs Current - Compact Key Metric */}
      {data.averageMonthlyExpense > 0 && (
        <Card className={`border-2 ${diffFromAvg > 10 ? 'border-red-300 bg-gradient-to-br from-red-50 to-white' : diffFromAvg < -10 ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  diffFromAvg > 10 ? 'bg-red-100 text-red-600' : diffFromAvg < -10 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{data.monthShortName} vs Average</p>
                  <p className="text-sm font-bold">
                    {currencySymbol}{data.totalExpense.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground mx-1">vs</span>
                    <span className="text-xs">{currencySymbol}{Math.round(data.averageMonthlyExpense).toLocaleString()} avg</span>
                  </p>
                </div>
              </div>
              <Badge className={`text-xs px-2 py-0.5 ${
                diffFromAvg > 10
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : diffFromAvg < -10
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {diffFromAvg > 0 ? '+' : ''}{diffFromAvg.toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== HERO CHART: Average vs Current Month (Enhanced) ====== */}
      {data.avgVsCurrentLineData.length > 0 && data.averageMonthlyExpense > 0 ? (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white">
          <CardHeader className="pb-1 px-3 pt-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Current vs Average
                </CardTitle>
              </div>
              {/* Avg period toggles */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setAvg1Y(!avg1Y)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                    avg1Y ? 'bg-slate-200 text-slate-800 border-slate-400' : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  1Y Avg
                </button>
                <button
                  onClick={() => setAvg2Y(!avg2Y)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                    avg2Y ? 'bg-blue-200 text-blue-800 border-blue-400' : 'bg-white text-blue-300 border-blue-200'
                  }`}
                >
                  2Y Avg
                </button>
                <button
                  onClick={() => setAvgAll(!avgAll)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                    avgAll ? 'bg-purple-200 text-purple-800 border-purple-400' : 'bg-white text-purple-300 border-purple-200'
                  }`}
                >
                  All Time Avg
                </button>
                <div className="ml-auto">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-6 text-[10px] w-auto min-w-[100px] border-slate-200">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(data.availableCategories || []).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={displayChartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="day"
                    fontSize={10}
                    tickFormatter={(v: number) => `${v}`}
                    ticks={[1, 5, 10, 15, 20, 25, 30]}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
                    fontSize={9}
                    width={45}
                  />
                  <Tooltip
                    formatter={(value: number | undefined, name: string) => {
                      if (value === undefined || value === null) return ['-', name]
                      const labels: Record<string, string> = {
                        current: 'Current Month',
                        average1Y: '1Y Average',
                        average2Y: '2Y Average',
                        averageAll: 'All Time Avg',
                      }
                      return [`${currencySymbol}${value.toLocaleString()}`, labels[name] || name]
                    }}
                    labelFormatter={(label: number) => `Day ${label}`}
                  />
                  {/* Today reference line */}
                  {isCurrentMonth && (
                    <ReferenceLine
                      x={currentDayOfMonth}
                      stroke="#6366f1"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{ value: 'Today', position: 'top', fontSize: 9, fill: '#6366f1' }}
                    />
                  )}
                  {/* Average lines */}
                  {avg1Y && (
                    <Line
                      type="monotone"
                      dataKey="average1Y"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name="average1Y"
                      activeDot={{ r: 3, fill: '#94a3b8' }}
                    />
                  )}
                  {avg2Y && data.avgVsCurrentLineData2Y && (
                    <Line
                      type="monotone"
                      dataKey="average2Y"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      name="average2Y"
                      activeDot={{ r: 3, fill: '#3b82f6' }}
                    />
                  )}
                  {avgAll && data.avgVsCurrentLineDataAll && (
                    <Line
                      type="monotone"
                      dataKey="averageAll"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name="averageAll"
                      activeDot={{ r: 3, fill: '#8b5cf6' }}
                    />
                  )}
                  {/* Current line */}
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                    name="current"
                    activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Compact legend */}
            <div className="mt-2 flex items-center justify-center gap-3 flex-wrap text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-emerald-500 rounded" />
                <span className="text-muted-foreground">Current</span>
              </div>
              {avg1Y && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400" />
                  <span className="text-muted-foreground">1Y Avg</span>
                </div>
              )}
              {avg2Y && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400" />
                  <span className="text-muted-foreground">2Y Avg</span>
                </div>
              )}
              {avgAll && (
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-purple-400" />
                  <span className="text-muted-foreground">All Time</span>
                </div>
              )}
              {isCurrentMonth && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0 border-l-2 border-dashed border-indigo-400" />
                  <span className="text-muted-foreground">Today</span>
                </div>
              )}
            </div>
            {/* Summary row */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-emerald-600 font-medium">Current</p>
                <p className="text-xs font-bold text-emerald-900">{currencySymbol}{data.totalExpense.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                <p className="text-[9px] text-slate-600 font-medium">1Y Average</p>
                <p className="text-xs font-bold text-slate-900">{currencySymbol}{Math.round(data.averageMonthlyExpense).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : data.totalExpense > 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-3 text-center">
            <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
            <h3 className="text-xs font-semibold mb-0.5">Current vs Average</h3>
            <p className="text-muted-foreground text-[10px]">
              Track for 2+ months to unlock the comparison chart.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* ====== YEARLY COMPARISON - Collapsed ====== */}
      {data.yearlyComparison.length > 0 && (
        <Card>
          <CardHeader className="pb-1 px-3 pt-2.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                Yearly Comparison
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-1.5"
                onClick={() => setShowYearly(!showYearly)}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showYearly ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          {showYearly && (
            <CardContent className="px-3 pb-3">
              {data.allTimeAvgMonthlyExpense > 0 && (
                <div className="bg-violet-50 rounded-lg p-2.5 border border-violet-200 mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-violet-600" />
                    <div>
                      <p className="text-[10px] text-violet-600 font-medium">All-Time Avg</p>
                      <p className="text-sm font-bold text-violet-900">{currencySymbol}{data.allTimeAvgMonthlyExpense.toLocaleString()}<span className="text-[10px] font-normal text-violet-600">/mo</span></p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {data.yearlyComparison.map((year) => {
                  const isCurrentYear = year.label.includes('Current')
                  return (
                    <div key={year.year} className={`rounded-lg p-2 border text-xs ${isCurrentYear ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{year.year}</span>
                        {isCurrentYear && <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1 py-0">Current</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <p className="text-muted-foreground text-[9px]">Avg Monthly</p>
                          <p className="font-bold">{currencySymbol}{year.avgMonthlyExpense.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[9px]">Total Expense</p>
                          <p className="font-bold">{currencySymbol}{year.totalExpense.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[9px]">Total Income</p>
                          <p className="font-bold text-emerald-700">{currencySymbol}{year.totalIncome.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-1.5">
          {data.alerts.map((alert, i) => (
            <Alert key={i} variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <AlertDescription className="text-xs">{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Row 4: 2-column - Classification + Category comparison stacked, Spending Distribution + Where Money Goes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left column: Classification + Category stacked */}
        <div className="space-y-3">
          {data.averageMonthlyExpense > 0 && classificationComparison.length > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                  Classification vs Average
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classificationComparison} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={9} />
                      <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={8} width={40} />
                      <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="current" fill="#10b981" name="Current" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {categoryComparison.length > 0 && data.averageMonthlyExpense > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs">Category vs Average</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryComparison} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={8} />
                      <YAxis type="category" dataKey="name" width={75} fontSize={9} />
                      <Tooltip formatter={(value: number, name: string) => [`${currencySymbol}${value.toLocaleString()}`, name]} />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="average" fill="#94a3b8" name="Avg" radius={[0, 2, 2, 0]} />
                      <Bar dataKey="current" fill="#10b981" name="Current" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Spending Distribution + Where Money Goes */}
        <div className="space-y-3">
          {classificationData.length > 0 && (
            <Card className="border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-500" />
                  Spending Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={classificationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
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
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                  {classificationData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-0.5 text-[9px]">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                  Where Money Goes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => `${currencySymbol}${v}`} fontSize={8} />
                      <YAxis type="category" dataKey="name" width={75} fontSize={9} />
                      <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#10b981" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Row 5: 2-column - Income vs Expense trend + 50/30/20 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {trendData.length > 0 && (
          <Card>
            <CardHeader className="pb-1 px-3 pt-2.5">
              <CardTitle className="text-xs">Income vs Expense Trend</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-2.5">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={9} />
                    <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={8} width={40} />
                    <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#incomeGradient)" name="Income" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGradient)" name="Expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 50/30/20 Rule Breakdown - Compact */}
        <Card>
          <CardHeader className="pb-1 px-3 pt-2.5">
            <CardTitle className="text-xs">50/30/20 Rule</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2.5 space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Needs (50%)
                </span>
                <span className="font-medium">{currencySymbol}{data.classificationBreakdown.need.toLocaleString()} ({needPercent}%)</span>
              </div>
              <Progress value={Math.min(needPercent, 100)} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Wants (30%)
                </span>
                <span className="font-medium">{currencySymbol}{data.classificationBreakdown.want.toLocaleString()} ({wantPercent}%)</span>
              </div>
              <Progress value={Math.min(wantPercent, 100)} className="h-2 [&>div]:bg-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Ego/Luxury
                </span>
                <span className="font-medium">{currencySymbol}{data.classificationBreakdown.ego.toLocaleString()} ({egoPercent}%)</span>
              </div>
              <Progress value={Math.min(egoPercent, 100)} className="h-2 [&>div]:bg-red-500" />
            </div>
            {data.classificationBreakdown.savings > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span>Savings: {currencySymbol}{data.classificationBreakdown.savings.toLocaleString()}</span>
              </div>
            )}
            {data.classificationBreakdown.debt > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Debt: {currencySymbol}{data.classificationBreakdown.debt.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
