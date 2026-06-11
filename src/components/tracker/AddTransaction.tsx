'use client'

import React, { useState, useEffect, useRef } from 'react'
import VoiceInput from './VoiceInput'
import TransactionConfirm, { CategorizedTransaction } from './TransactionConfirm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Type, Mic, Receipt, CheckCircle2, PlusCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

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

export default function AddTransaction({ onTransactionAdded, userName }: AddTransactionProps) {
  const { currencySymbol } = useCurrency()
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [language, setLanguage] = useState<'en' | 'bn' | 'hi'>('en')
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [categorizedData, setCategorizedData] = useState<CategorizedTransaction | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [lastAdded, setLastAdded] = useState<{ description: string; amount: number; type: string } | null>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

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

  const examples = language === 'bn' ? BANGLA_EXAMPLES : ENGLISH_EXAMPLES

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
          <button
            onClick={() => setInputMode('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === 'voice'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="w-4 h-4" />
            {language === 'bn' ? 'ভয়েস' : 'Voice'}
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Type className="w-4 h-4" />
            {language === 'bn' ? 'টেক্সট' : 'Text'}
          </button>
        </div>
      </div>

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
