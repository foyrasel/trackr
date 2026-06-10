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
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import {
  AlertTriangle, TrendingUp, TrendingDown, Lightbulb,
  Target, Zap, ArrowRight, Shield, PiggyBank, Scale,
  Brain, Wallet, Flame, DollarSign, Activity, CheckCircle2,
  XCircle, Clock, Eye,
} from 'lucide-react'
import { useCurrency } from './CurrencyContext'

interface InsightsData {
  currentMonth: string
  totalExpense: number
  totalIncome: number
  balance: number
  classificationBreakdown: { need: number; want: number; ego: number; savings: number; debt: number }
  categoryBreakdown: Record<string, number>
  incomeBreakdown: Record<string, number>
  spendingTypeBreakdown: Record<string, number>
  dailySpending: Record<string, number>
  monthlyTrend: Record<string, { income: number; expense: number }>
  alerts: string[]
  transactionCount: number
}

interface AIInsights {
  financialHealthScore: {
    score: number
    label: string
    color: string
    breakdown: { savingsRate: number; consistency: number; budgetAdherence: number; goalProgress: number; debtRatio: number }
  }
  spendingPersonality: {
    type: string
    icon: string
    description: string
    percentageBreakdown: { weekday: number; weekend: number }
  }
  strengthsAndWeaknesses: {
    strengths: Array<{ category: string; current: number; average: number; savedAmount: number; percentDiff: number }>
    weaknesses: Array<{ category: string; current: number; average: number; extraAmount: number; percentDiff: number }>
  }
  potentialSavings: {
    totalPotentialSavings: number
    actions: Array<{ category: string; monthlySaving: number; yearlySaving: number; action: string }>
  }
  goalAnalysis: {
    goals: Array<{
      id: string; name: string; targetAmount: number; savedAmount: number
      monthlyNeeded: number; monthlyActual: number; trajectory: string
      monthsToComplete: number; blockingCategories: Array<{ category: string; excessAmount: number }>
    }>
  }
  spendingAnomalies: {
    anomalies: Array<{ category: string; current: number; average: number; percentChange: number; type: string }>
  }
  safeToSpend: {
    safeToSpend: number; fixedExpenses: number; goalContributions: number; daysRemaining: number; perDay: number
  }
  cashFlowForecast: {
    projectedExpense: number; projectedBalance: number; isDeficit: boolean; dailyBurnRate: number
  }
}

interface InsightsPanelProps {
  refreshTrigger: number
  userName?: string
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  need: '#10b981', want: '#f59e0b', ego: '#ef4444', savings: '#3b82f6', debt: '#8b5cf6',
}

type TabType = 'overview' | 'strengths' | 'savings' | 'alerts'

export default function InsightsPanel({ refreshTrigger, userName }: InsightsPanelProps) {
  const { currencySymbol } = useCurrency()
  const [data, setData] = useState<InsightsData | null>(null)
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      const [analyticsRes, insightsRes] = await Promise.all([
        fetch('/api/analytics', { headers }),
        fetch('/api/insights', { headers }),
      ])
      if (analyticsRes.ok) setData(await analyticsRes.json())
      if (insightsRes.ok) setAiInsights(await insightsRes.json())
    } catch (error) {
      console.error('Error fetching insights:', error)
    } finally {
      setLoading(false)
    }
  }, [userName])

  useEffect(() => {
    if (mounted) fetchData()
  }, [fetchData, refreshTrigger, mounted])

  if (loading || !mounted) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-2"><div className="h-4 bg-muted rounded w-1/3" /><div className="h-8 bg-muted rounded w-1/2" /></div></CardContent></Card>
        ))}
      </div>
    )
  }

  if (!data || data.transactionCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-base font-semibold mb-1">No Insights Yet</h3>
          <p className="text-muted-foreground text-xs">Add some transactions to get personalized insights.</p>
        </CardContent>
      </Card>
    )
  }

  const totalExpense = data.totalExpense
  const { need, want, ego, savings, debt } = data.classificationBreakdown
  const ai = aiInsights

  // Radar chart data
  const radarData = [
    { subject: 'Needs', value: need > 0 ? Math.min((need / totalExpense) * 100, 100) : 0, ideal: 50 },
    { subject: 'Wants', value: want > 0 ? Math.min((want / totalExpense) * 100, 100) : 0, ideal: 30 },
    { subject: 'Ego', value: ego > 0 ? Math.min((ego / totalExpense) * 100, 100) : 0, ideal: 0 },
    { subject: 'Savings', value: savings > 0 ? Math.min((savings / totalExpense) * 100, 100) : 0, ideal: 20 },
    { subject: 'Debt', value: debt > 0 ? Math.min((debt / totalExpense) * 100, 100) : 0, ideal: 0 },
  ]

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Brain className="w-3 h-3" /> },
    { key: 'strengths', label: 'Strengths & Weaknesses', icon: <Target className="w-3 h-3" /> },
    { key: 'savings', label: 'Savings & Goals', icon: <PiggyBank className="w-3 h-3" /> },
    { key: 'alerts', label: 'Alerts', icon: <AlertTriangle className="w-3 h-3" /> },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-bold">AI Insights</h2>
        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">AI-Powered</Badge>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && (
        <>
          {/* Financial Health Score */}
          {ai?.financialHealthScore && (
            <Card className="border-2" style={{ borderColor: ai.financialHealthScore.color + '60' }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                      <circle cx="40" cy="40" r="34" fill="none" stroke={ai.financialHealthScore.color} strokeWidth="6"
                        strokeDasharray={`${(ai.financialHealthScore.score / 100) * 213.6} 213.6`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold" style={{ color: ai.financialHealthScore.color }}>{ai.financialHealthScore.score}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Financial Health Score</p>
                    <p className="text-xs text-muted-foreground">{ai.financialHealthScore.label}</p>
                    <div className="mt-2 grid grid-cols-5 gap-1 text-[9px]">
                      {Object.entries(ai.financialHealthScore.breakdown).map(([key, val]) => (
                        <div key={key} className="text-center">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: val > 60 ? '#10b981' : val > 30 ? '#f59e0b' : '#ef4444' }} /></div>
                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spending Personality */}
          {ai?.spendingPersonality && (
            <Card className="bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/10 dark:to-gray-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl">
                    {ai.spendingPersonality.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-violet-600 font-medium">Your Spending Personality</p>
                    <p className="text-sm font-bold text-violet-900 dark:text-violet-300">{ai.spendingPersonality.type}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ai.spendingPersonality.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-3 text-[10px]">
                  <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-blue-900 dark:text-blue-300">{ai.spendingPersonality.percentageBreakdown.weekday}%</p>
                    <p className="text-blue-600">Weekday</p>
                  </div>
                  <div className="flex-1 bg-purple-50 dark:bg-purple-950/30 rounded-lg p-2 text-center">
                    <p className="font-bold text-purple-900 dark:text-purple-300">{ai.spendingPersonality.percentageBreakdown.weekend}%</p>
                    <p className="text-purple-600">Weekend</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safe to Spend */}
          {ai?.safeToSpend && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-emerald-600 font-medium">Safe to Spend</p>
                    <p className="text-xl font-bold text-emerald-900">{currencySymbol}{ai.safeToSpend.safeToSpend.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                  <div className="text-center">
                    <p className="font-bold">{currencySymbol}{ai.safeToSpend.fixedExpenses.toLocaleString()}</p>
                    <p className="text-muted-foreground">Fixed Bills</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{currencySymbol}{ai.safeToSpend.goalContributions.toLocaleString()}</p>
                    <p className="text-muted-foreground">Goal Savings</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{currencySymbol}{ai.safeToSpend.perDay.toLocaleString()}</p>
                    <p className="text-muted-foreground">Per Day Left</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Spending Profile Radar */}
          {totalExpense > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-500" />
                  Spending Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" fontSize={10} tick={{ fill: '#6b7280' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} tick={{ fill: '#9ca3af' }} />
                      <Radar name="Your Spending" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Ideal" dataKey="ideal" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} strokeDasharray="5 5" strokeWidth={1.5} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 mt-1 text-[9px]">
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 opacity-60" />Your Spending</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 opacity-40" />Ideal Target</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Smart Tips */}
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
        </>
      )}

      {/* ====== STRENGTHS & WEAKNESSES TAB ====== */}
      {activeTab === 'strengths' && (
        <>
          {/* Strengths */}
          {ai?.strengthsAndWeaknesses && ai.strengthsAndWeaknesses.strengths.length > 0 && (
            <Card className="border-l-4 border-l-emerald-400">
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 space-y-2">
                {ai.strengthsAndWeaknesses.strengths.map((s, i) => (
                  <div key={i} className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{s.category}</span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[9px]">-{s.percentDiff.toFixed(0)}%</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {currencySymbol}{s.current.toLocaleString()} vs {currencySymbol}{s.average.toLocaleString()} avg — saving {currencySymbol}{s.savedAmount.toLocaleString()}/mo
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Weaknesses */}
          {ai?.strengthsAndWeaknesses && ai.strengthsAndWeaknesses.weaknesses.length > 0 && (
            <Card className="border-l-4 border-l-red-400">
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  Needs Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 space-y-2">
                {ai.strengthsAndWeaknesses.weaknesses.map((w, i) => (
                  <div key={i} className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{w.category}</span>
                      <Badge className="bg-red-100 text-red-800 text-[9px]">+{w.percentDiff.toFixed(0)}%</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {currencySymbol}{w.current.toLocaleString()} vs {currencySymbol}{w.average.toLocaleString()} avg — extra {currencySymbol}{w.extraAmount.toLocaleString()}/mo
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Where to Cut - from basic data */}
          {Object.keys(data.categoryBreakdown).length > 0 && (
            <Card className="border border-red-100 dark:border-red-900/30 bg-gradient-to-br from-red-50/30 to-white">
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                  Where to Cut Spending
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 space-y-2">
                {Object.entries(data.categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([name, amount], i) => {
                    const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
                    return (
                      <div key={name} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded bg-muted flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                            {name}
                          </span>
                          <span className="font-medium">{currencySymbol}{amount.toLocaleString()}</span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className={`h-1.5 ${i === 0 ? '[&>div]:bg-red-500' : i === 1 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ====== SAVINGS & GOALS TAB ====== */}
      {activeTab === 'savings' && (
        <>
          {/* Potential Savings */}
          {ai?.potentialSavings && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600 font-medium">Potential Savings This Year</p>
                    <p className="text-xl font-bold text-emerald-900">{currencySymbol}{ai.potentialSavings.totalPotentialSavings.toLocaleString()}</p>
                  </div>
                </div>
                {ai.potentialSavings.actions.length > 0 ? (
                  <div className="space-y-1.5">
                    {ai.potentialSavings.actions.map((action, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/80 dark:bg-gray-800/50 rounded-lg p-2 border border-emerald-100">
                        <div className="flex-1">
                          <p className="text-xs font-semibold">{action.category}</p>
                          <p className="text-[10px] text-muted-foreground">{action.action}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs font-bold text-emerald-700">{currencySymbol}{action.monthlySaving.toLocaleString()}/mo</p>
                          <p className="text-[9px] text-muted-foreground">{currencySymbol}{action.yearlySaving.toLocaleString()}/yr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Your spending is already optimized. Great job!</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Goal Analysis */}
          {ai?.goalAnalysis && ai.goalAnalysis.goals.length > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  Goal Progress & Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 space-y-2.5">
                {ai.goalAnalysis.goals.map((goal, i) => {
                  const pct = goal.targetAmount > 0 ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0
                  const trajectoryColor = goal.trajectory === 'on_track' ? 'text-emerald-600' : goal.trajectory === 'behind' ? 'text-amber-600' : 'text-red-600'
                  const trajectoryLabel = goal.trajectory === 'on_track' ? 'On Track' : goal.trajectory === 'behind' ? 'Behind' : 'At Risk'
                  return (
                    <div key={i} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold">{goal.name}</span>
                        <Badge className={`text-[9px] ${goal.trajectory === 'on_track' ? 'bg-emerald-100 text-emerald-800' : goal.trajectory === 'behind' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {trajectoryLabel}
                        </Badge>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-2 mb-1.5" />
                      <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                        <div>
                          <p className="text-muted-foreground">Saved</p>
                          <p className="font-bold">{currencySymbol}{goal.savedAmount.toLocaleString()} ({pct}%)</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Monthly Needed</p>
                          <p className="font-bold">{currencySymbol}{goal.monthlyNeeded.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Monthly Actual</p>
                          <p className={`font-bold ${trajectoryColor}`}>{currencySymbol}{goal.monthlyActual.toLocaleString()}</p>
                        </div>
                      </div>
                      {goal.blockingCategories.length > 0 && (
                        <div className="mt-1.5 p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded text-[9px]">
                          <p className="font-semibold text-amber-800 mb-0.5">Why behind:</p>
                          {goal.blockingCategories.slice(0, 2).map((bc, j) => (
                            <p key={j} className="text-amber-700">{bc.category}: {currencySymbol}{bc.excessAmount.toLocaleString()} above average</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Income Sources */}
          {Object.keys(data.incomeBreakdown).length > 0 && (
            <Card>
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
                  Income Sources
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5">
                <div className="space-y-1.5">
                  {Object.entries(data.incomeBreakdown).sort(([, a], [, b]) => b - a).map(([source, amount]) => (
                    <div key={source} className="flex items-center justify-between text-xs">
                      <span>{source}</span>
                      <span className="font-medium text-emerald-700">{currencySymbol}{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ====== ALERTS TAB ====== */}
      {activeTab === 'alerts' && (
        <>
          {/* Spending Anomalies */}
          {ai?.spendingAnomalies && ai.spendingAnomalies.anomalies.length > 0 && (
            <Card className="border-l-4 border-l-amber-400">
              <CardHeader className="pb-1 px-3 pt-2.5">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Spending Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2.5 space-y-2">
                {ai.spendingAnomalies.anomalies.map((a, i) => (
                  <div key={i} className={`rounded-lg p-2.5 ${a.type === 'spike' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{a.category}</span>
                      <Badge className={`text-[9px] ${a.type === 'spike' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {a.type === 'spike' ? <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> : <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                        {a.percentChange > 0 ? '+' : ''}{a.percentChange.toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {currencySymbol}{a.current.toLocaleString()} vs {currencySymbol}{a.average.toLocaleString()} avg
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Cash Flow Forecast */}
          {ai?.cashFlowForecast && (
            <Card className={`border-2 ${ai.cashFlowForecast.isDeficit ? 'border-red-300 bg-gradient-to-br from-red-50/50 to-white' : 'border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ai.cashFlowForecast.isDeficit ? 'bg-red-100' : 'bg-emerald-100'}`}>
                    <Activity className={`w-5 h-5 ${ai.cashFlowForecast.isDeficit ? 'text-red-600' : 'text-emerald-600'}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium">Cash Flow Forecast</p>
                    <p className="text-lg font-bold">
                      Projected: {currencySymbol}{ai.cashFlowForecast.projectedBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="text-center">
                    <p className="font-bold">{currencySymbol}{ai.cashFlowForecast.projectedExpense.toLocaleString()}</p>
                    <p className="text-muted-foreground">Projected Expense</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{currencySymbol}{ai.cashFlowForecast.dailyBurnRate.toLocaleString()}</p>
                    <p className="text-muted-foreground">Daily Burn Rate</p>
                  </div>
                  <div className="text-center">
                    <Badge className={ai.cashFlowForecast.isDeficit ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}>
                      {ai.cashFlowForecast.isDeficit ? 'Deficit Risk' : 'Surplus'}
                    </Badge>
                  </div>
                </div>
                {ai.cashFlowForecast.isDeficit && (
                  <p className="mt-2 text-[10px] text-red-700 font-medium">Warning: At this pace, you may overspend this month. Consider cutting discretionary expenses.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alerts from analytics */}
          {data.alerts.length > 0 ? (
            <div className="space-y-1.5">
              {data.alerts.map((alert, i) => (
                <Alert key={i} variant="destructive" className="border-amber-300 bg-amber-50 text-amber-900 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <AlertDescription className="text-xs">{alert}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                <p className="text-xs font-semibold">No Alerts</p>
                <p className="text-[10px] text-muted-foreground">Your spending looks healthy this month!</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
