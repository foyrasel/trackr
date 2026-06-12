'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import {
  AlertTriangle, TrendingUp, TrendingDown, Lightbulb,
  Target, Zap, ArrowRight, Shield, PiggyBank, Scale,
} from 'lucide-react'
import { useCurrency } from './CurrencyContext'

interface InsightsData {
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
  alerts: string[]
  transactionCount: number
}

interface InsightsPanelProps {
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

export default function InsightsPanel({ refreshTrigger, userName }: InsightsPanelProps) {
  const { currencySymbol } = useCurrency()
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Mark as mounted after first client render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      // Also include email and id from localStorage for reliable user lookup
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
      const response = await fetch('/api/analytics', { headers })
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [userName])

  useEffect(() => {
    if (mounted) fetchAnalytics()
  }, [fetchAnalytics, refreshTrigger, mounted])

  // Show loading skeleton until mounted (avoids hydration mismatch from Date/fetch)
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

  if (!data || data.transactionCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">No Insights Yet</h3>
          <p className="text-muted-foreground text-sm">
            Add some transactions to get personalized insights and spending analysis.
          </p>
        </CardContent>
      </Card>
    )
  }

  const totalExpense = data.totalExpense
  const { need, want, ego, savings, debt } = data.classificationBreakdown

  // Generate smart tips
  const tips: { icon: React.ReactNode; title: string; description: string; priority: 'high' | 'medium' | 'low' }[] = []

  if (data.totalIncome > 0) {
    const savingsRate = ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
    if (savingsRate < 20) {
      tips.push({
        icon: <PiggyBank className="w-5 h-5 text-amber-500" />,
        title: 'Boost Your Savings',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Aim for at least 20% by cutting non-essential spending. Even saving ${currencySymbol}${Math.round(data.totalIncome * 0.2 - (data.totalIncome - data.totalExpense))} more would help.`,
        priority: 'high',
      })
    } else {
      tips.push({
        icon: <PiggyBank className="w-5 h-5 text-emerald-500" />,
        title: 'Great Savings Rate!',
        description: `You're saving ${savingsRate.toFixed(1)}% of your income. Keep it up! Consider investing the surplus for long-term growth.`,
        priority: 'low',
      })
    }
  }

  if (ego > 0 && totalExpense > 0 && ego / totalExpense > 0.15) {
    const topEgoCategory = Object.entries(data.categoryBreakdown)
      .sort(([, a], [, b]) => b - a)[0]
    tips.push({
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      title: 'Ego Spending Alert',
      description: `${((ego / totalExpense) * 100).toFixed(1)}% of your spending is on ego/luxury items${topEgoCategory ? ` (top: ${topEgoCategory[0]})` : ''}. Try reducing this by ${currencySymbol}${Math.round(ego * 0.3)}/month.`,
      priority: 'high',
    })
  }

  if (debt > 0 && data.totalIncome > 0) {
    tips.push({
      icon: <Shield className="w-5 h-5 text-purple-500" />,
      title: 'Debt Management',
      description: `Debt repayment takes ${((debt / data.totalIncome) * 100).toFixed(1)}% of your income. Consider the avalanche method - pay off highest interest debt first.`,
      priority: debt / data.totalIncome > 0.3 ? 'high' : 'medium',
    })
  }

  if (want > 0 && totalExpense > 0 && want / totalExpense > 0.30) {
    tips.push({
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      title: 'Cut Want Spending',
      description: `Your want spending is ${((want / totalExpense) * 100).toFixed(1)}% of expenses. Target 30% max. Look at subscriptions and dining out first.`,
      priority: 'medium',
    })
  }

  if (Object.keys(data.spendingTypeBreakdown).length > 0) {
    const creditTotal = data.spendingTypeBreakdown.credit || 0
    if (creditTotal > totalExpense * 0.4 && creditTotal > 0) {
      tips.push({
        icon: <Scale className="w-5 h-5 text-sky-500" />,
        title: 'Credit Card Usage',
        description: `${((creditTotal / totalExpense) * 100).toFixed(1)}% of your spending is on credit. Try shifting to cash/debit to avoid interest charges.`,
        priority: 'medium',
      })
    }
  }

  if (tips.length === 0) {
    tips.push({
      icon: <Target className="w-5 h-5 text-emerald-500" />,
      title: 'On Track!',
      description: 'Your spending patterns look healthy. Keep monitoring and stay consistent with your budget goals.',
      priority: 'low',
    })
  }

  // Radar chart data for spending profile
  const radarData = [
    { subject: 'Needs', value: need > 0 ? Math.min((need / totalExpense) * 100, 100) : 0, ideal: 50 },
    { subject: 'Wants', value: want > 0 ? Math.min((want / totalExpense) * 100, 100) : 0, ideal: 30 },
    { subject: 'Ego', value: ego > 0 ? Math.min((ego / totalExpense) * 100, 100) : 0, ideal: 0 },
    { subject: 'Savings', value: savings > 0 ? Math.min((savings / totalExpense) * 100, 100) : 0, ideal: 20 },
    { subject: 'Debt', value: debt > 0 ? Math.min((debt / totalExpense) * 100, 100) : 0, ideal: 0 },
  ]

  // Category ranking for "where to cut"
  const categoryRank = Object.entries(data.categoryBreakdown)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  // ── Money Tree anatomy data ────────────────────────────────────────────────
  const savingsRate = data.totalIncome > 0
    ? Math.max(0, Math.round(((data.totalIncome - data.totalExpense) / data.totalIncome) * 100))
    : 0
  const topBranches = Object.entries(data.categoryBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
  const maxBranch = topBranches.length > 0 ? topBranches[0][1] : 1

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold font-display" style={{ color: '#2D5016' }}>Smart Insights</h2>
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
          AI-Powered
        </Badge>
      </div>

      {/* ── Money Tree anatomy ── */}
      <Card style={{ background: 'linear-gradient(150deg, #F9F8F5, rgba(107,173,61,0.06))', border: '1px solid rgba(45,80,22,0.1)' }}>
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-display font-bold text-sm mb-3" style={{ color: '#2D5016' }}>
            🌳 Your Money Tree — {data.currentMonth}
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Mini tree SVG */}
            <svg viewBox="0 0 160 190" className="w-32 shrink-0" role="img" aria-label="Money tree anatomy">
              {/* Roots — savings */}
              <path d="M80 160 C70 170 55 173 42 177" stroke="#8B7355" strokeWidth="4" fill="none" strokeLinecap="round" opacity={savingsRate > 0 ? 1 : 0.3} />
              <path d="M80 160 C90 170 105 173 118 177" stroke="#8B7355" strokeWidth="4" fill="none" strokeLinecap="round" opacity={savingsRate > 0 ? 1 : 0.3} />
              <path d="M80 160 C80 168 78 174 75 180" stroke="#8B7355" strokeWidth="3" fill="none" strokeLinecap="round" opacity={savingsRate > 10 ? 1 : 0.3} />
              {/* Trunk — income */}
              <path d="M74 160 C76 130 74 115 77 96 L83 96 C86 115 84 130 86 160 Z" fill="#8B7355" />
              {/* Branches — top categories, thickness ∝ spend */}
              {topBranches.map(([, amount], i) => {
                const t = 2 + (amount / maxBranch) * 4
                const dirs = [
                  'M78 110 C62 100 50 96 38 94',
                  'M82 102 C98 92 110 88 124 86',
                  'M78 122 C66 118 56 116 46 116',
                  'M82 116 C96 110 108 108 118 108',
                ]
                return <path key={i} d={dirs[i]} stroke="#8B7355" strokeWidth={t} fill="none" strokeLinecap="round" />
              })}
              {/* Canopy — leaves ∝ transactions */}
              <circle cx="80" cy="62" r="38" fill="#2D5016" />
              <circle cx="52" cy="78" r="24" fill="#3d6b1f" />
              <circle cx="110" cy="76" r="22" fill="#3d6b1f" />
              <circle cx="68" cy="46" r="18" fill="#4a7d28" />
              <circle cx="96" cy="48" r="17" fill="#4a7d28" />
              {Array.from({ length: Math.min(8, Math.ceil(data.transactionCount / 5)) }).map((_, i) => (
                <ellipse key={i} cx={50 + (i * 17) % 70} cy={42 + (i * 23) % 48} rx="4.5" ry="6.5" fill={i % 2 ? '#8fc763' : '#6BAD3D'} />
              ))}
            </svg>

            {/* Legend with live numbers */}
            <div className="flex-1 w-full grid grid-cols-2 gap-2.5 text-[12px]">
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(139,115,85,0.1)' }}>
                <p className="font-data text-[10px] uppercase tracking-wide" style={{ color: '#8B7355' }}>Roots · Savings</p>
                <p className="font-display font-bold text-lg" style={{ color: savingsRate >= 20 ? '#2D5016' : '#8B7355' }}>{savingsRate}%</p>
                <p className="text-[10px] text-muted-foreground">of income kept</p>
              </div>
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(139,115,85,0.1)' }}>
                <p className="font-data text-[10px] uppercase tracking-wide" style={{ color: '#8B7355' }}>Trunk · Income</p>
                <p className="font-display font-bold text-lg" style={{ color: '#2D5016' }}>{currencySymbol}{data.totalIncome.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">flowing this month</p>
              </div>
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(107,173,61,0.1)' }}>
                <p className="font-data text-[10px] uppercase tracking-wide" style={{ color: '#2D5016' }}>Branches · Spending</p>
                <p className="font-display font-bold text-lg" style={{ color: '#2D5016' }}>{topBranches.length}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  biggest: {topBranches[0]?.[0] ?? '—'}
                </p>
              </div>
              <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(107,173,61,0.1)' }}>
                <p className="font-data text-[10px] uppercase tracking-wide" style={{ color: '#2D5016' }}>Leaves · Entries</p>
                <p className="font-display font-bold text-lg" style={{ color: '#2D5016' }}>{data.transactionCount}</p>
                <p className="text-[10px] text-muted-foreground">logged this month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Smart Tips */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          Personalized Tips
        </h3>
        {tips.sort((a, b) => a.priority === 'high' ? -1 : 1).map((tip, i) => (
          <Card key={i} className={`border-l-4 ${
            tip.priority === 'high' ? 'border-l-red-400' : 
            tip.priority === 'medium' ? 'border-l-amber-400' : 'border-l-emerald-400'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{tip.icon}</div>
                <div>
                  <p className="font-semibold text-sm">{tip.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{tip.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spending Profile Radar */}
      {totalExpense > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Your Spending Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                  <Radar name="Your Spending" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Ideal" dataKey="ideal" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeDasharray="5 5" />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-1">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-60" />
                Your Spending
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-3 h-3 rounded-full bg-gray-400 opacity-40" />
                Ideal Target
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Where to Cut Spending */}
      {categoryRank.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Where to Cut Spending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryRank.slice(0, 5).map((item, i) => {
              const percent = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      {item.name}
                    </span>
                    <span className="font-medium">{currencySymbol}{item.amount.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={Math.min(percent, 100)} 
                    className={`h-2 ${i === 0 ? '[&>div]:bg-red-500' : i === 1 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {percent.toFixed(1)}% of total spending
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Monthly Comparison */}
      {Object.keys(data.monthlyTrend).length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={
                  Object.entries(data.monthlyTrend)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([month, values]) => ({
                      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                      income: values.income,
                      expense: values.expense,
                    }))
                }>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis tickFormatter={(v: number) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} fontSize={10} />
                  <Tooltip formatter={(value: number) => `${currencySymbol}${value.toLocaleString()}`} />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income Sources */}
      {Object.keys(data.incomeBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-emerald-500" />
              Income Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.incomeBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([source, amount]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="text-sm">{source}</span>
                    <span className="text-sm font-medium text-emerald-700">{currencySymbol}{amount.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
