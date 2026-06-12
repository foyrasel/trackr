'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { useCurrency } from './CurrencyContext'

interface Txn {
  id: string
  type: string
  amount: number
  description: string
  category: string
  date: string
}

interface TreeDashboardProps {
  refreshTrigger: number
  userName?: string
  onTransactionAdded?: () => void
}

// Living Tree palette (intentionally light per design spec — calm, not anxious)
const C = {
  forest: '#2D5016',
  leaf: '#6BAD3D',
  earth: '#8B7355',
  bg: '#F9F8F5',
  warmWarn: '#E8B4A8',
  text: '#2C2C2C',
}

const EXPENSE_CATEGORIES = [
  { name: 'Groceries', emoji: '🛒' },
  { name: 'Food & Dining', emoji: '🍛' },
  { name: 'Transport', emoji: '🛺' },
  { name: 'Utilities', emoji: '💡' },
  { name: 'Rent', emoji: '🏠' },
  { name: 'Healthcare', emoji: '🩺' },
  { name: 'Entertainment', emoji: '🎬' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Education', emoji: '📚' },
  { name: 'Personal Care', emoji: '🧴' },
  { name: 'Travel', emoji: '✈️' },
  { name: 'Other', emoji: '📦' },
]

const INCOME_CATEGORIES = [
  { name: 'Salary', emoji: '💼' },
  { name: 'Freelance', emoji: '💻' },
  { name: 'Business', emoji: '🏪' },
  { name: 'Gift Received', emoji: '🎁' },
  { name: 'Refund', emoji: '↩️' },
  { name: 'Other', emoji: '📦' },
]

function insightCopy(weekCount: number): string {
  if (weekCount < 3) return "🌱 You're just getting started — every entry helps your tree take root."
  if (weekCount <= 7) return `🌱 Great progress! ${weekCount} entries this week. Keep logging and keep growing.`
  if (weekCount <= 14) return `🌿 Excellent momentum! ${weekCount} entries this week — your tree is thriving.`
  return `🌳 Amazing dedication! ${weekCount} entries this week. Your awareness is flourishing.`
}

export default function TreeDashboard({ refreshTrigger, userName, onTransactionAdded }: TreeDashboardProps) {
  const { currencySymbol } = useCurrency()
  const [txns, setTxns] = useState<Txn[]>([])
  const [budgetPct, setBudgetPct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [pulsing, setPulsing] = useState(false)
  const [fabSuccess, setFabSuccess] = useState(false)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [txnType, setTxnType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const getAuthHeaders = useCallback((json = false): Record<string, string> => {
    const h: Record<string, string> = {}
    if (json) h['Content-Type'] = 'application/json'
    if (userName) h['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const e = localStorage.getItem('trackr_user_email')
      const i = localStorage.getItem('trackr_user_id')
      if (e) h['x-user-email'] = e
      if (i) h['x-user-id'] = i
    }
    return h
  }, [userName])

  const fetchData = useCallback(async () => {
    try {
      const [txRes, budgetRes] = await Promise.all([
        fetch('/api/transactions?limit=200', { headers: getAuthHeaders() }),
        fetch('/api/budgets', { headers: getAuthHeaders() }),
      ])
      if (txRes.ok) {
        const d = await txRes.json()
        setTxns(d.transactions || [])
      }
      if (budgetRes.ok) {
        const d = await budgetRes.json()
        const active = (d.budgets || []).filter((b: { isIgnored: boolean }) => !b.isIgnored)
        const total = active.reduce((s: number, b: { amount: number }) => s + b.amount, 0)
        const spent = active.reduce((s: number, b: { spent: number }) => s + b.spent, 0)
        setBudgetPct(total > 0 ? Math.round((spent / total) * 100) : null)
      }
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => { fetchData() }, [fetchData, refreshTrigger])

  // Escape closes modal
  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false) }
    window.addEventListener('keydown', onKey)
    setTimeout(() => amountRef.current?.focus(), 60)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now()
    const DAY = 86400000
    const weekAgo = now - 7 * DAY
    const twoWeeksAgo = now - 14 * DAY

    const thisWeek = txns.filter(t => new Date(t.date).getTime() >= weekAgo)
    const lastWeek = txns.filter(t => {
      const ts = new Date(t.date).getTime()
      return ts >= twoWeeksAgo && ts < weekAgo
    })
    const weeklySpend = thisWeek.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const lastEntry = txns.length > 0 ? txns[0] : null

    const daysSinceLast = lastEntry
      ? Math.floor((now - new Date(lastEntry.date).getTime()) / DAY)
      : null

    // Streak: consecutive days (ending today or yesterday) with at least one entry
    const daySet = new Set(txns.map(t => new Date(t.date).toDateString()))
    let streak = 0
    const cursor = new Date()
    if (!daySet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
    while (daySet.has(cursor.toDateString())) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    // Health: new users start healthy (possibility, not depletion).
    // "Needs water" only after 7+ idle days.
    let health: number
    let needsWater = false
    if (txns.length === 0) {
      health = 95
    } else if (daysSinceLast !== null && daysSinceLast >= 7) {
      needsWater = true
      health = Math.max(40, 70 - (daysSinceLast - 7) * 3)
    } else {
      health = Math.min(100, 70 + thisWeek.length * 3 + streak * 2 - (daysSinceLast || 0) * 4)
      health = Math.max(50, health)
    }

    return {
      weekCount: thisWeek.length,
      trend: thisWeek.length - lastWeek.length,
      weeklySpend,
      lastEntry,
      streak,
      health: Math.round(health),
      needsWater,
      isNew: txns.length === 0,
    }
  }, [txns])

  // Milestones per spec: 5 → flower, 10 → bird, 25+ → extra bloom
  const hasFlower = stats.weekCount >= 5
  const hasBird = stats.weekCount >= 10
  const hasBloom = stats.weekCount >= 25

  // ── Save transaction ───────────────────────────────────────────────────────
  const handleSave = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !category) return
    setSaving(true)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          type: txnType,
          amount: amt,
          description: description.trim() || category,
          category,
          spendingType: 'cash',
          classification: txnType === 'income' ? 'income' : 'need',
          date: new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) throw new Error('save failed')

      // Close + reset, then let the tree respond
      setModalOpen(false)
      setAmount('')
      setCategory('')
      setDescription('')
      setPulsing(true)
      setFabSuccess(true)
      setTimeout(() => setPulsing(false), 1200)
      setTimeout(() => setFabSuccess(false), 1000)
      fetchData()
      onTransactionAdded?.()
    } catch {
      // keep modal open so nothing is lost
    } finally {
      setSaving(false)
    }
  }

  const categories = txnType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const lastEntryTime = stats.lastEntry
    ? new Date(stats.lastEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      className="font-narrative -mx-4 md:-mx-6 -mt-5 min-h-screen pb-32"
      style={{ background: C.bg, color: C.text }}
    >
      <div className="max-w-[900px] mx-auto px-4 md:px-6">

        {/* ── ZONE 1: TREE HERO ── */}
        <section
          className="relative flex flex-col items-center pt-6 pb-4 rounded-b-3xl"
          style={{ background: 'linear-gradient(135deg, rgba(45,80,22,0.08), rgba(107,173,61,0.06))', minHeight: '52vh' }}
          aria-label="Your financial tree"
        >
          {/* Streak badge — subtle, top right, only when >2 days */}
          {stats.streak > 2 && (
            <div className="absolute top-4 right-4 font-data text-[11px] px-2.5 py-1 rounded-full"
                 style={{ background: 'rgba(107,173,61,0.12)', color: C.forest }}>
              🔥 {stats.streak}-day streak
            </div>
          )}

          <p className="text-sm mb-2" style={{ color: C.earth }}>
            {stats.isNew
              ? `Welcome${userName ? `, ${userName.split(' ')[0]}` : ''} — your tree is ready to grow`
              : stats.needsWater
                ? '🌧️ Your tree could use some water — log an entry to revive it'
                : `Good to see you${userName ? `, ${userName.split(' ')[0]}` : ''}`}
          </p>

          {/* Tree + pulse ring */}
          <div className="relative flex-1 flex items-end justify-center w-full">
            {pulsing && (
              <div
                className="tree-pulse-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 0 8px rgba(107,173,61,0.35)`, background: 'rgba(107,173,61,0.12)' }}
              />
            )}
            <svg
              viewBox="0 0 200 240"
              className={`tree-sway w-full max-w-[200px] ${stats.needsWater ? 'opacity-70 saturate-50' : ''}`}
              role="img"
              aria-label={`Tree health ${stats.health} percent`}
            >
              {/* Roots */}
              <path d="M100 208 C90 216 72 218 58 222" stroke={C.earth} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M100 208 C110 216 128 218 142 222" stroke={C.earth} strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M100 208 C98 216 96 222 92 228" stroke={C.earth} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M100 208 C102 216 106 222 112 228" stroke={C.earth} strokeWidth="3" fill="none" strokeLinecap="round" />

              {/* Trunk */}
              <path d="M93 208 C95 170 92 150 96 128 L104 128 C108 150 105 170 107 208 Z" fill={C.earth} />
              <path d="M98 150 C88 140 78 136 70 134" stroke={C.earth} strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M102 142 C112 130 122 126 132 124" stroke={C.earth} strokeWidth="5" fill="none" strokeLinecap="round" />

              {/* Canopy (breathes) */}
              <g className="leaf-breathe">
                <circle cx="100" cy="84" r="50" fill={C.forest} />
                <circle cx="64" cy="106" r="34" fill="#3d6b1f" />
                <circle cx="138" cy="102" r="32" fill="#3d6b1f" />
                <circle cx="84" cy="64" r="26" fill="#4a7d28" />
                <circle cx="122" cy="68" r="24" fill="#4a7d28" />
                {/* Highlight leaves — flutter on input */}
                <ellipse className={pulsing ? 'leaf-flutter' : ''} cx="70" cy="78" rx="7" ry="10" fill={C.leaf} />
                <ellipse className={pulsing ? 'leaf-flutter' : ''} style={{ animationDelay: '60ms' }} cx="132" cy="80" rx="7" ry="10" fill={C.leaf} />
                <ellipse className={pulsing ? 'leaf-flutter' : ''} style={{ animationDelay: '120ms' }} cx="100" cy="52" rx="7" ry="10" fill="#8fc763" />
                <ellipse className={pulsing ? 'leaf-flutter' : ''} style={{ animationDelay: '180ms' }} cx="52" cy="108" rx="6" ry="9" fill={C.leaf} />
                <ellipse className={pulsing ? 'leaf-flutter' : ''} style={{ animationDelay: '240ms' }} cx="150" cy="106" rx="6" ry="9" fill="#8fc763" />
                <ellipse className={pulsing ? 'leaf-flutter' : ''} style={{ animationDelay: '300ms' }} cx="92" cy="100" rx="7" ry="10" fill="#8fc763" />

                {/* Milestones */}
                {hasFlower && (
                  <g className="milestone-in">
                    <circle cx="78" cy="92" r="5" fill="#f2c4cf" />
                    <circle cx="78" cy="92" r="2" fill="#e8a0b4" />
                  </g>
                )}
                {hasBloom && (
                  <g className="milestone-in">
                    <circle cx="124" cy="56" r="5" fill="#f2c4cf" />
                    <circle cx="124" cy="56" r="2" fill="#e8a0b4" />
                  </g>
                )}
                {hasBird && (
                  <g className="milestone-in">
                    <path d="M142 44 q5 -7 11 -2 q6 -5 11 2 q-6 7 -11 4 q-5 3 -11 -4" fill={C.forest} />
                  </g>
                )}
              </g>
            </svg>

            {/* Health % over roots */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pointer-events-none">
              <p className="font-display font-bold leading-none" style={{ fontSize: 48, color: C.forest }}>
                {loading ? '··' : `${stats.health}%`}
              </p>
              <p className="font-data text-[11px] mt-1" style={{ color: C.earth }}>tree health</p>
            </div>
          </div>
        </section>

        {/* ── ZONE 2: QUICK STATS ── */}
        <section
          className="bg-white rounded-2xl p-5 mt-4"
          style={{ border: '1px solid rgba(45,80,22,0.08)' }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs" style={{ color: C.earth }}>This Week</p>
              <p className="font-display font-bold text-[28px] leading-tight" style={{ color: C.text }}>
                {stats.weekCount} <span className="text-sm font-narrative font-normal" style={{ color: C.earth }}>inputs</span>
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.earth }}>Trend</p>
              <p className="font-display font-bold text-[28px] leading-tight" style={{ color: stats.trend >= 0 ? C.leaf : C.earth }}>
                {stats.trend > 0 ? '↑' : stats.trend < 0 ? '↓' : '·'} {Math.abs(stats.trend)}
                <span className="text-sm font-narrative font-normal ml-1" style={{ color: C.earth }}>vs last week</span>
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.earth }}>Weekly Spend</p>
              <p className="font-display font-bold text-[28px] leading-tight" style={{ color: C.text }}>
                {currencySymbol}{stats.weeklySpend.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.earth }}>Budget Used</p>
              <p className="font-display font-bold text-[28px] leading-tight"
                 style={{ color: budgetPct !== null && budgetPct > 90 ? '#c9826f' : C.text }}>
                {budgetPct !== null ? `${budgetPct}%` : '—'}
              </p>
            </div>
          </div>

          {/* Last entry */}
          {stats.lastEntry && (
            <div
              className="mt-4 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ background: 'rgba(107,173,61,0.06)', borderLeft: `3px solid ${C.leaf}` }}
            >
              <div className="min-w-0">
                <p className="text-xs" style={{ color: C.earth }}>Last entry</p>
                <p className="text-sm font-medium truncate">{stats.lastEntry.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-data text-sm" style={{ color: stats.lastEntry.type === 'income' ? C.leaf : C.text }}>
                  {stats.lastEntry.type === 'income' ? '+' : '−'}{currencySymbol}{stats.lastEntry.amount.toLocaleString()}
                </p>
                <p className="font-data text-[11px]" style={{ color: C.earth }}>{stats.lastEntry.category} · {lastEntryTime}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── ZONE 4: INSIGHT CARD ── */}
        <section
          className="rounded-2xl px-4 py-3.5 mt-3 text-[13px]"
          style={{ background: 'rgba(107,173,61,0.08)', border: `1px solid ${C.leaf}`, color: C.forest }}
        >
          {insightCopy(stats.weekCount)}
        </section>
      </div>

      {/* ── ZONE 3: FLOATING ACTION BUTTON ── */}
      <button
        onClick={() => setModalOpen(true)}
        aria-label="Add transaction"
        className="fixed md:bottom-8 right-5 md:right-8 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-[1.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 z-50"
        style={{
          background: fabSuccess ? C.leaf : C.forest,
          boxShadow: '0 6px 18px rgba(45,80,22,0.35)',
          outlineColor: C.forest,
          bottom: 'max(5rem, calc(4.5rem + env(safe-area-inset-bottom)))',
        }}
        onMouseEnter={e => { if (!fabSuccess) (e.currentTarget as HTMLButtonElement).style.background = C.leaf }}
        onMouseLeave={e => { if (!fabSuccess) (e.currentTarget as HTMLButtonElement).style.background = C.forest }}
      >
        {fabSuccess ? <Check className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </button>

      {/* ── ADD TRANSACTION MODAL ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Add transaction"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => setModalOpen(false)} />
          <div
            className="relative w-full md:max-w-md bg-white md:rounded-2xl rounded-t-3xl p-5 max-h-[92vh] overflow-y-auto"
            style={{ color: C.text }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg" style={{ color: C.forest }}>Add Transaction</h2>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-full hover:bg-gray-100 focus-visible:outline focus-visible:outline-2"
                style={{ outlineColor: C.forest }}
              >
                <X className="w-4 h-4" style={{ color: C.earth }} />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-4">
              {(['expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTxnType(t); setCategory('') }}
                  className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background: txnType === t ? (t === 'income' ? 'rgba(107,173,61,0.15)' : 'rgba(45,80,22,0.1)') : '#f5f4f0',
                    color: txnType === t ? C.forest : C.earth,
                    border: txnType === t ? `1.5px solid ${C.leaf}` : '1.5px solid transparent',
                    outlineColor: C.forest,
                  }}
                >
                  {t === 'expense' ? '💸 Expense' : '💰 Income'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <label className="block text-xs mb-1" style={{ color: C.earth }}>Amount</label>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-display font-bold text-2xl" style={{ color: C.forest }}>{currencySymbol}</span>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 font-display font-bold text-3xl bg-transparent outline-none placeholder:opacity-30"
                style={{ color: C.text }}
              />
            </div>

            {/* Category grid — 4 cols */}
            <label className="block text-xs mb-1.5" style={{ color: C.earth }}>Category</label>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {categories.map(c => (
                <button
                  key={c.name}
                  onClick={() => setCategory(c.name)}
                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-medium leading-tight transition-colors focus-visible:outline focus-visible:outline-2"
                  style={{
                    background: category === c.name ? 'rgba(107,173,61,0.15)' : '#f5f4f0',
                    border: category === c.name ? `1.5px solid ${C.leaf}` : '1.5px solid transparent',
                    color: category === c.name ? C.forest : C.text,
                    outlineColor: C.forest,
                  }}
                >
                  <span className="text-lg leading-none">{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>

            {/* Description */}
            <label className="block text-xs mb-1" style={{ color: C.earth }}>Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. Lunch with friends"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm mb-5 outline-none focus-visible:outline focus-visible:outline-2"
              style={{ background: '#f5f4f0', color: C.text, outlineColor: C.forest }}
            />

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: '#f5f4f0', color: C.earth, outlineColor: C.forest }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !parseFloat(amount) || !category}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: C.forest, boxShadow: '0 4px 12px rgba(45,80,22,0.25)', outlineColor: C.forest }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1f3810' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.forest }}
              >
                {saving ? 'Saving…' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
