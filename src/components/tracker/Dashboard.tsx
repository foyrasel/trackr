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
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  ArrowUpRight, ArrowDownRight, PiggyBank, CreditCard,
  Flame, ShoppingBag, Sparkles, Shield, BarChart3,
} from 'lucide-react'

interface AnalyticsData {
  currentMonth: string
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
  alerts: string[]
  transactionCount: number
}

interface DashboardProps {
  refreshTrigger: number
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

export default function Dashboard({ refreshTrigger }: DashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted) fetchAnalytics()
  }, [fetchAnalytics, refreshTrigger, mounted])

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

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-700 font-medium">Income</span>
            </div>
            <p className="text-xl font-bold text-emerald-900">৳{data.totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-700 font-medium">Expense</span>
            </div>
            <p className="text-xl font-bold text-red-900">৳{data.totalExpense.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${data.balance >= 0 ? 'from-emerald-50 to-emerald-100/50 border-emerald-200' : 'from-red-50 to-red-100/50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">Balance</span>
            </div>
            <p className={`text-xl font-bold ${data.balance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
              ৳{data.balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PiggyBank className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Savings Rate</span>
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
                  <p className="text-xs text-muted-foreground">This Month vs Average</p>
                  <p className="text-lg font-bold">
                    ৳{data.totalExpense.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground mx-1">vs</span>
                    <span className="text-sm">৳{Math.round(data.averageMonthlyExpense).toLocaleString()} avg</span>
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
                <p className="text-[10px] text-muted-foreground mt-1">
                  {diffFromAvg > 10 ? 'Spending too much!' : diffFromAvg < -10 ? 'Great savings!' : 'On track'}
                </p>
              </div>
            </div>
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
              <span className="font-medium">৳{data.classificationBreakdown.need.toLocaleString()} ({needPercent}%)</span>
            </div>
            <Progress value={Math.min(needPercent, 100)} className="h-2.5" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Wants (Target: 30%)
              </span>
              <span className="font-medium">৳{data.classificationBreakdown.want.toLocaleString()} ({wantPercent}%)</span>
            </div>
            <Progress value={Math.min(wantPercent, 100)} className="h-2.5 [&>div]:bg-amber-500" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Ego/Luxury
              </span>
              <span className="font-medium">৳{data.classificationBreakdown.ego.toLocaleString()} ({egoPercent}%)</span>
            </div>
            <Progress value={Math.min(egoPercent, 100)} className="h-2.5 [&>div]:bg-red-500" />
          </div>

          {data.classificationBreakdown.savings > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span>Savings: ৳{data.classificationBreakdown.savings.toLocaleString()}</span>
            </div>
          )}

          {data.classificationBreakdown.debt > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Debt: ৳{data.classificationBreakdown.debt.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average vs Current Expense Chart */}
      {data.averageMonthlyExpense > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Average vs Current Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classificationComparison} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis tickFormatter={(v: number) => `৳${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(value: number, name: string) => [`৳${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Bar dataKey="average" fill="#94a3b8" name="Avg Monthly" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="current" fill="#10b981" name="This Month" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Avg Monthly Expense: <strong>৳{Math.round(data.averageMonthlyExpense).toLocaleString()}</strong></span>
              <span>Current: <strong>৳{data.totalExpense.toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>
      ) : data.totalExpense > 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-semibold mb-1">Average vs Current Month</h3>
            <p className="text-muted-foreground text-xs">
              Keep tracking for 2+ months to unlock the average expense comparison chart.
            </p>
          </CardContent>
        </Card>
      ) : null}

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
                  <XAxis type="number" tickFormatter={(v: number) => `৳${v}`} fontSize={10} />
                  <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                  <Tooltip formatter={(value: number, name: string) => [`৳${value.toLocaleString()}`, name]} />
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
                      formatter={(value: number) => `৳${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {classificationData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1 text-xs">
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
                    <XAxis type="number" tickFormatter={(v: number) => `৳${v}`} fontSize={10} />
                    <YAxis type="category" dataKey="name" width={90} fontSize={11} />
                    <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
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
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis tickFormatter={(v: number) => `৳${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(value: number) => `৳${value.toLocaleString()}`} />
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
                    {type === 'cash' ? '💵' : type === 'debit' ? '💳' : '💳'}
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{type}</p>
                    <p className="font-bold text-sm">৳{amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
