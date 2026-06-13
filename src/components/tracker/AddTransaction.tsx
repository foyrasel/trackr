'use client'

import React, { useState, useEffect, useRef } from 'react'
import VoiceInput from './VoiceInput'
import TransactionConfirm, { CategorizedTransaction } from './TransactionConfirm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Type, Mic, Receipt, CheckCircle2, PlusCircle, Layers, Trash2, Loader2, AlertCircle, Check } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface BulkRow {
  id: string
  line: string
  status: 'pending' | 'processing' | 'done' | 'error'
  data?: CategorizedTransaction
  error?: string
}

interface Account {
  id: string
  name: string
  type: string
  icon: string
}

interface AddTransactionProps {
  onTransactionAdded: () => void
  userName?: string
}

const BANGLA_EXAMPLES = [
  'বাজারে ৫০০ টাকা খরচ',
  'বাসা ভাড়া ১৫০০০ টাকা',
  'গতকাল রিকশায় ১০০ টাকা',
  'বেতন পেয়েছি ৫০০০০ টাকা',
  'গত শুক্রবার বাজারে ২০০০ টাকা',
]

const ENGLISH_EXAMPLES = [
  'Spent 200 on transport',
  'Paid 1500 rent from debit yesterday',
  'Income 5000 salary',
  'Bought groceries for 800 cash',
  'Last Friday 50 on coffee',
]

const CATEGORY_EMOJIS: Record<string, string> = {
  'Groceries': '🛒', 'Food & Dining': '🍛', 'Transport': '🛺', 'Utilities': '💡',
  'Rent': '🏠', 'Healthcare': '🩺', 'Entertainment': '🎬', 'Shopping': '🛍️',
  'Personal Care': '💆', 'Education': '📚', 'Gadgets & Electronics': '📱',
  'Insurance': '🛡️', 'Subscriptions': '📺', 'Travel': '✈️', 'Gifts': '🎁',
  'Charity': '🤲', 'Other': '📌', 'Salary': '💼', 'Freelance': '💻',
  'Business': '🏢', 'Investment': '📈', 'Rental': '🏘️', 'Side Hustle': '⚡',
  'Gift Received': '🎁', 'Refund': '↩️',
}

const QUICK_EXPENSE_CATS = ['Groceries', 'Food & Dining', 'Transport', 'Utilities', 'Rent', 'Healthcare', 'Entertainment', 'Shopping']
const QUICK_INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Investment', 'Side Hustle', 'Gift Received', 'Refund', 'Other']

const AUTO_CLASSIFICATION: Record<string, string> = {
  Groceries: 'need', 'Food & Dining': 'want', Transport: 'need', Utilities: 'need',
  Rent: 'need', Healthcare: 'need', Entertainment: 'want', Shopping: 'want',
  'Personal Care': 'need', Education: 'need', 'Gadgets & Electronics': 'want',
  Insurance: 'need', Subscriptions: 'want', Travel: 'want', Gifts: 'want',
  Charity: 'want', Other: 'need',
}

export default function AddTransaction({ onTransactionAdded, userName }: AddTransactionProps) {
  const { currencySymbol } = useCurrency()
  const [inputMode, setInputMode] = useState<'quick' | 'voice' | 'text' | 'bulk'>('quick')
  const [language, setLanguage] = useState<'en' | 'bn' | 'hi'>('en')
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [categorizedData, setCategorizedData] = useState<CategorizedTransaction | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [lastAdded, setLastAdded] = useState<{ description: string; amount: number; type: string } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  // Quick add state
  const [quickType, setQuickType] = useState<'expense' | 'income'>('expense')
  const [quickAmount, setQuickAmount] = useState('')
  const [quickCategory, setQuickCategory] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)

  // Bulk entry state
  const [bulkInput, setBulkInput] = useState('')
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [isBulkSaving, setIsBulkSaving] = useState(false)

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (userName) headers['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
    }
    return headers
  }

  // Preload accounts once so TransactionConfirm renders instantly without its own fetch
  useEffect(() => {
    fetch('/api/accounts', { headers: getAuthHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then(result => setAccounts(result?.accounts || []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName])

  const handleTranscript = async (text: string) => {
    await processInput(text)
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    await processInput(textInput.trim())
  }

  const handleQuickSave = async () => {
    const amount = parseFloat(quickAmount)
    if (!amount || amount <= 0 || !quickCategory) return
    setQuickSaving(true)
    try {
      const headers = getAuthHeaders()
      headers['Content-Type'] = 'application/json'
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: quickType,
          amount,
          description: quickNote.trim() || quickCategory,
          category: quickCategory,
          classification: quickType === 'income' ? 'income' : (AUTO_CLASSIFICATION[quickCategory] || 'need'),
          spendingType: 'cash',
          date: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        setQuickAmount('')
        setQuickNote('')
        setQuickCategory('')
        toast({ title: `${quickType === 'income' ? 'Income' : 'Expense'} saved!` })
        onTransactionAdded()
      } else {
        toast({ title: 'Failed to save', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' })
    } finally {
      setQuickSaving(false)
    }
  }

  const processInput = async (text: string) => {
    setIsProcessing(true)
    setLastAdded(null)
    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          if (errorData.result) {
            setCategorizedData(errorData.result)
            return
          }
        } catch {}
        throw new Error('Failed to categorize')
      }

      const data = await response.json()
      setCategorizedData(data.result)
    } catch (error) {
      console.error('Error processing input:', error)
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn'
          ? 'আপনার ইনপুট প্রক্রিয়া করা যায়নি। আবার চেষ্টা করুন।'
          : 'Failed to process your input. Please try again or enter manually.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async (data: CategorizedTransaction) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error('Failed to save transaction')

      // Show what was just saved for context
      setLastAdded({ description: data.description, amount: data.amount, type: data.type })

      // Immediately reset to input mode — don't wait for dashboard refresh
      setCategorizedData(null)
      setTextInput('')
      setInputMode('text')

      // Focus the text input so user can type the next transaction right away
      setTimeout(() => textInputRef.current?.focus(), 80)

      // Refresh dashboard data in background
      onTransactionAdded()

      const today = new Date().toISOString().split('T')[0]
      const isPastDate = data.date && data.date !== today
      toast({
        title: data.type === 'income' ? '💰 Income Added!' : '💸 Expense Recorded!',
        description: isPastDate
          ? `${currencySymbol}${data.amount.toLocaleString()} - ${data.description} (${new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : `${currencySymbol}${data.amount.toLocaleString()} - ${data.description}`,
      })
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to save transaction. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = () => {
    setCategorizedData(null)
    setTextInput('')
    setLastAdded(null)
  }

  // ── BULK ENTRY ──

  const handleBulkProcess = async () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return

    const rows: BulkRow[] = lines.map((line, i) => ({
      id: `${Date.now()}-${i}`,
      line,
      status: 'processing',
    }))
    setBulkRows(rows)
    setIsBulkProcessing(true)

    const results = await Promise.all(
      rows.map(async (row) => {
        try {
          const res = await fetch('/api/ai/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ text: row.line }),
          })
          const json = res.ok ? await res.json() : await res.json().catch(() => null)
          const data: CategorizedTransaction = json?.result ?? (json?.result || null)
          if (!data) throw new Error('No result')
          return { ...row, status: 'done' as const, data }
        } catch {
          return { ...row, status: 'error' as const, error: 'Could not parse' }
        }
      })
    )
    setBulkRows(results)
    setIsBulkProcessing(false)
  }

  const removeBulkRow = (id: string) => setBulkRows(prev => prev.filter(r => r.id !== id))

  const updateBulkRow = (id: string, updates: Partial<CategorizedTransaction>) => {
    setBulkRows(prev => prev.map(r =>
      r.id === id && r.data ? { ...r, data: { ...r.data, ...updates } } : r
    ))
  }

  const handleBulkSaveAll = async () => {
    const ready = bulkRows.filter(r => r.status === 'done' && r.data && r.data.amount > 0)
    if (!ready.length) return
    setIsBulkSaving(true)
    let saved = 0
    let failed = 0
    for (const row of ready) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(row.data),
        })
        if (res.ok) {
          saved++
          setBulkRows(prev => prev.filter(r => r.id !== row.id))
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    setIsBulkSaving(false)
    if (saved > 0) {
      onTransactionAdded()
      toast({ title: `${saved} transaction${saved > 1 ? 's' : ''} saved!` })
    }
    if (failed > 0) {
      toast({ title: `${failed} transaction${failed > 1 ? 's' : ''} failed to save`, variant: 'destructive' })
    }
    if (saved > 0 && bulkRows.filter(r => r.status === 'done').length === saved) {
      setBulkInput('')
    }
  }

  const examples = language === 'bn' ? BANGLA_EXAMPLES : ENGLISH_EXAMPLES

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* ─── Mode selector ─── */}
      <div className="flex gap-2">
        <button
          onClick={() => setInputMode('quick')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${inputMode === 'quick' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-emerald-300'}`}
        >
          ⚡ Quick Add
        </button>
        <button
          onClick={() => setInputMode('bulk')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${inputMode === 'bulk' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-emerald-300'}`}
        >
          📋 Bulk
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${inputMode === 'text' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-emerald-300'}`}
        >
          🤖 AI Parse
        </button>
        <button
          onClick={() => setInputMode('voice')}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${inputMode === 'voice' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-muted-foreground hover:border-emerald-300'}`}
        >
          🎤 Voice
        </button>
      </div>

      {/* ─── QUICK ADD mode ─── */}
      {inputMode === 'quick' && !categorizedData && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setQuickType('expense'); setQuickCategory('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${quickType === 'expense' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              💸 Expense
            </button>
            <button
              onClick={() => { setQuickType('income'); setQuickCategory('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${quickType === 'income' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              💰 Income
            </button>
          </div>

          {/* Amount input */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Amount</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold" style={{ color: '#065f46' }}>{currencySymbol}</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && quickAmount && quickCategory) handleQuickSave() }}
                className="flex-1 text-4xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-200 dark:placeholder-gray-700"
                style={{ fontFamily: 'inherit' }}
                autoFocus
              />
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700 mt-2" />
          </div>

          {/* Category grid */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Category</p>
            <div className="grid grid-cols-4 gap-2">
              {(quickType === 'expense' ? QUICK_EXPENSE_CATS : QUICK_INCOME_CATS).map(cat => (
                <button
                  key={cat}
                  onClick={() => setQuickCategory(cat)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[10px] font-medium leading-tight text-center transition-all border-2 ${quickCategory === cat ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'}`}
                >
                  <span className="text-xl">{CATEGORY_EMOJIS[cat] || '📌'}</span>
                  <span className="leading-tight">{cat.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note input */}
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Note (optional)</p>
            <input
              type="text"
              placeholder={`e.g. ${quickType === 'expense' ? 'Lunch with friends' : 'Monthly salary'}`}
              value={quickNote}
              onChange={e => setQuickNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && quickAmount && quickCategory) handleQuickSave() }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900/40 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => { setQuickAmount(''); setQuickNote(''); setQuickCategory('') }}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-sm font-semibold text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Clear
            </button>
            <button
              onClick={handleQuickSave}
              disabled={!quickAmount || !quickCategory || quickSaving}
              className="flex-[2] py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#065f46' }}
            >
              {quickSaving ? '⏳ Saving...' : `Add ${quickType === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </div>
        </div>
      )}

      {/* Last added context banner */}
      {lastAdded && !categorizedData && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-emerald-800 flex-1 truncate">
            Saved: <strong>{lastAdded.description}</strong> — {currencySymbol}{lastAdded.amount.toLocaleString()}
          </span>
          <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-emerald-600 text-xs">Add next</span>
        </div>
      )}

      {/* Voice Input */}
      {inputMode === 'voice' && !categorizedData && (
        <div className="py-8">
          <VoiceInput
            onTranscript={handleTranscript}
            isProcessing={isProcessing}
            language={language}
            onLanguageChange={setLanguage}
          />
          <div className="mt-6 text-center">
            {language === 'bn' ? (
              <>
                <p className="text-xs text-muted-foreground">উচ্চারণ করুন: &quot;বাজারে ৫০০ টাকা খরচ&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">অথবা: &quot;গতকাল রিকশায় ১০০ টাকা&quot;</p>
                <p className="text-xs text-blue-500 mt-1">তারিখ বললে সেটা অটোমেটিক সেট হবে</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Try saying: &quot;Spent 500 on groceries from cash&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">or: &quot;Paid 200 yesterday for transport&quot;</p>
                <p className="text-xs text-blue-500 mt-1">Mention &quot;yesterday&quot;, &quot;last Friday&quot; — date will be auto-set</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && !categorizedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              {language === 'bn' ? 'লেনদেন বর্ণনা করুন' : language === 'hi' ? 'अपना लेनदेन बताएं' : 'Describe Your Transaction'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Language toggle */}
            <div className="flex items-center gap-2 mb-3">
              {(['en', 'bn', 'hi'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    language === lang
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'en' ? 'English' : lang === 'bn' ? 'বাংলা' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                ref={textInputRef}
                placeholder={language === 'bn'
                  ? 'যেমন: গতকাল বাজারে ৫০০ টাকা খরচ'
                  : language === 'hi'
                  ? 'उदा: कल बाजार में 500 रुपये खर्च'
                  : 'e.g., Spent 500 on groceries yesterday'
                }
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setTextInput(example)
                    setTimeout(() => textInputRef.current?.focus(), 50)
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── BULK ENTRY MODE ── */}
      {inputMode === 'bulk' && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Bulk Entry — one transaction per line
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter multiple transactions at once. AI will parse all lines in parallel.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {bulkRows.length === 0 ? (
              <>
                <textarea
                  className="w-full min-h-[160px] rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y font-mono leading-relaxed"
                  placeholder={`Coffee 5\nGroceries 120 yesterday\nBus fare 2.50\nSalary 3500 income\nNetflix subscription 15`}
                  value={bulkInput}
                  onChange={e => setBulkInput(e.target.value)}
                  disabled={isBulkProcessing}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {bulkInput.split('\n').filter(l => l.trim()).length} line{bulkInput.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} detected
                  </p>
                  <Button
                    onClick={handleBulkProcess}
                    disabled={!bulkInput.trim() || isBulkProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  >
                    {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {isBulkProcessing ? 'Parsing…' : 'Parse All'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {bulkRows.map(row => (
                    <div key={row.id} className={`rounded-lg border p-3 flex items-start gap-3 text-sm transition-colors ${
                      row.status === 'done' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900' :
                      row.status === 'error' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900' :
                      'bg-muted/40 border-border'
                    }`}>
                      <div className="shrink-0 mt-0.5">
                        {row.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        {row.status === 'done' && <Check className="w-4 h-4 text-emerald-600" />}
                        {row.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {row.status === 'done' && row.data ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${row.data.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {row.data.type}
                              </span>
                              {row.data.amount > 0 ? (
                                <span className="font-bold text-[15px]">{currencySymbol}{row.data.amount.toLocaleString()}</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="text-[13px] text-muted-foreground">{currencySymbol}</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    autoFocus
                                    placeholder="Add amount"
                                    className="w-24 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                                    onChange={e => updateBulkRow(row.id, { amount: parseFloat(e.target.value) || 0 })}
                                  />
                                </span>
                              )}
                              <span className="text-muted-foreground truncate">{row.data.description}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-muted">{row.data.category}</span>
                              <span>{row.data.date}</span>
                              <span className="capitalize">{row.data.classification}</span>
                              {row.data.amount <= 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">⚠ needs amount</span>}
                            </div>
                          </div>
                        ) : row.status === 'error' ? (
                          <div>
                            <p className="text-red-600 dark:text-red-400 text-xs font-medium">Failed to parse</p>
                            <p className="text-muted-foreground truncate text-xs">{row.line}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground truncate text-xs">{row.line}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeBulkRow(row.id)}
                        className="shrink-0 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-muted-foreground hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => { setBulkRows([]); setBulkInput('') }}
                    className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                  >
                    Start over
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {bulkRows.filter(r => r.status === 'done' && r.data && r.data.amount > 0).length} of {bulkRows.length} ready
                    </span>
                    <Button
                      onClick={handleBulkSaveAll}
                      disabled={isBulkSaving || bulkRows.filter(r => r.status === 'done' && r.data && r.data.amount > 0).length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {isBulkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {isBulkSaving ? 'Saving…' : `Save ${bulkRows.filter(r => r.status === 'done' && r.data && r.data.amount > 0).length}`}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Card */}
      {categorizedData && (
        <TransactionConfirm
          data={categorizedData}
          onConfirm={handleConfirm}
          onReject={handleReject}
          isSaving={isSaving}
          userName={userName}
          preloadedAccounts={accounts}
        />
      )}
    </div>
  )
}
