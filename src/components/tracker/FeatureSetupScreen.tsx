'use client'

import React, { useState } from 'react'
import TrackrLogo from './TrackrLogo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, ChevronRight, Sparkles, Send, Mail, Users, Eye, EyeOff, ExternalLink } from 'lucide-react'

interface FeatureSetupScreenProps {
  userName?: string
  onComplete: () => void
}

interface FeatureState {
  gemini: 'idle' | 'editing' | 'done' | 'skipped'
  telegram: 'idle' | 'editing' | 'done' | 'skipped'
  email: 'idle' | 'done' | 'skipped'
  family: 'skipped'
}

function getAuthHeaders(userName?: string): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (userName) h['x-user-name'] = userName
  if (typeof window !== 'undefined') {
    const e = localStorage.getItem('trackr_user_email')
    const i = localStorage.getItem('trackr_user_id')
    if (e) h['x-user-email'] = e
    if (i) h['x-user-id'] = i
  }
  return h
}

export default function FeatureSetupScreen({ userName, onComplete }: FeatureSetupScreenProps) {
  const [features, setFeatures] = useState<FeatureState>({
    gemini: 'idle', telegram: 'idle', email: 'idle', family: 'skipped',
  })
  const [geminiKey, setGeminiKey] = useState('')
  const [geminiShow, setGeminiShow] = useState(false)
  const [geminiSaving, setGeminiSaving] = useState(false)

  const [telegramToken, setTelegramToken] = useState('')
  const [telegramSaving, setTelegramSaving] = useState(false)

  const [emailSaving, setEmailSaving] = useState(false)

  const set = (key: keyof FeatureState, val: FeatureState[keyof FeatureState]) =>
    setFeatures(prev => ({ ...prev, [key]: val }))

  const saveGemini = async () => {
    if (!geminiKey.trim()) return
    setGeminiSaving(true)
    await fetch('/api/user', {
      method: 'PUT',
      headers: getAuthHeaders(userName),
      body: JSON.stringify({ geminiApiKey: geminiKey.trim() }),
    }).catch(() => {})
    setGeminiSaving(false)
    set('gemini', 'done')
  }

  const saveTelegram = async () => {
    if (!telegramToken.trim()) return
    setTelegramSaving(true)
    await fetch('/api/user', {
      method: 'PUT',
      headers: getAuthHeaders(userName),
      body: JSON.stringify({ telegramToken: telegramToken.trim() }),
    }).catch(() => {})
    setTelegramSaving(false)
    set('telegram', 'done')
  }

  const saveEmail = async () => {
    setEmailSaving(true)
    await fetch('/api/user', {
      method: 'PUT',
      headers: getAuthHeaders(userName),
      body: JSON.stringify({ monthlyReportEnabled: true }),
    }).catch(() => {})
    setEmailSaving(false)
    set('email', 'done')
  }

  const allSettled = Object.values(features).every(v => v === 'done' || v === 'skipped')

  const CARDS = [
    {
      key: 'gemini' as const,
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      bg: 'from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/20',
      border: 'border-purple-100 dark:border-purple-900/40',
      title: 'AI Categorization',
      description: 'Add your free Gemini API key for smarter, faster expense categorization.',
      linkLabel: 'Get free key at aistudio.google.com',
      linkHref: 'https://aistudio.google.com/app/apikey',
    },
    {
      key: 'telegram' as const,
      icon: <Send className="w-5 h-5 text-blue-500" />,
      bg: 'from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20',
      border: 'border-blue-100 dark:border-blue-900/40',
      title: 'Telegram Bot',
      description: 'Log transactions instantly by texting your Trackr bot — no app needed.',
      linkLabel: 'Create a bot via @BotFather on Telegram',
      linkHref: 'https://t.me/botfather',
    },
    {
      key: 'email' as const,
      icon: <Mail className="w-5 h-5 text-emerald-500" />,
      bg: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      title: 'Monthly Reports',
      description: 'Receive a beautifully summarised monthly report in your inbox.',
      linkLabel: null,
      linkHref: null,
    },
    {
      key: 'family' as const,
      icon: <Users className="w-5 h-5 text-amber-500" />,
      bg: 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20',
      border: 'border-amber-100 dark:border-amber-900/40',
      title: 'Family Wallet',
      description: 'Share your wallet with a partner or family member to track together.',
      linkLabel: null,
      linkHref: null,
      comingSoon: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-950 dark:to-emerald-950/20 flex flex-col items-center justify-center px-4 py-10">
      {/* Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <TrackrLogo size={48} />
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900 dark:text-white">Power up Trackr</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
          Set up optional features now — or skip any of them and configure later in Settings.
        </p>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-5">
          {['Intro', 'Accounts', 'Features'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${i < 2 ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 2 ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {i < 2 ? <Check className="w-3 h-3" /> : '3'}
                </div>
                {step}
              </div>
              {i < 2 && <div className="w-6 h-px bg-emerald-300" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <div className="w-full max-w-md space-y-3">
        {CARDS.map(card => {
          const state = features[card.key]
          const isDone = state === 'done'
          const isSkipped = state === 'skipped'
          const isEditing = state === 'editing'

          return (
            <div
              key={card.key}
              className={`rounded-2xl border bg-gradient-to-br ${card.bg} ${card.border} overflow-hidden transition-all`}
            >
              {/* Card header row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm">
                  {isDone ? <Check className="w-5 h-5 text-emerald-600" /> : card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.title}</p>
                    {(card as { comingSoon?: boolean }).comingSoon && (
                      <span className="text-[10px] font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-full px-2 py-0.5">
                        Coming soon
                      </span>
                    )}
                    {isDone && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-2 py-0.5">Done ✓</span>}
                    {isSkipped && <span className="text-[10px] text-muted-foreground">Skipped</span>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{card.description}</p>
                </div>

                {/* Action buttons (idle state) */}
                {!isDone && !isSkipped && !isEditing && (
                  <div className="flex gap-1.5 shrink-0">
                    {!(card as { comingSoon?: boolean }).comingSoon ? (
                      <>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm font-semibold"
                          onClick={() => {
                            if (card.key === 'email') { saveEmail(); return }
                            set(card.key, 'editing')
                          }}
                        >
                          Set up
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-gray-700"
                          onClick={() => set(card.key, 'skipped')}
                        >
                          Skip
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => set(card.key, 'skipped')}>
                        Skip
                      </Button>
                    )}
                  </div>
                )}

                {/* Undo skip */}
                {isSkipped && !isDone && (
                  <button onClick={() => set(card.key, 'idle')} className="text-xs text-muted-foreground hover:text-gray-700 shrink-0 underline">
                    Undo
                  </button>
                )}
              </div>

              {/* Expanded setup UI */}
              {isEditing && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/50 dark:border-white/10 pt-3">
                  {card.linkLabel && card.linkHref && (
                    <a
                      href={card.linkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {card.linkLabel}
                    </a>
                  )}

                  {card.key === 'gemini' && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={geminiShow ? 'text' : 'password'}
                          placeholder="AIza…"
                          value={geminiKey}
                          onChange={e => setGeminiKey(e.target.value)}
                          className="pr-9 text-sm h-9 bg-white/80 dark:bg-gray-900/60"
                        />
                        <button
                          type="button"
                          onClick={() => setGeminiShow(p => !p)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {geminiShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <Button size="sm" className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-4" onClick={saveGemini} disabled={geminiSaving || !geminiKey.trim()}>
                        {geminiSaving ? '…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-9 px-2 text-muted-foreground" onClick={() => set('gemini', 'skipped')}>Skip</Button>
                    </div>
                  )}

                  {card.key === 'telegram' && (
                    <div className="space-y-2">
                      <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Open Telegram → message <span className="font-mono font-semibold text-blue-600">@BotFather</span></li>
                        <li>Send <span className="font-mono bg-white/70 dark:bg-gray-800/50 px-1 rounded">/newbot</span> and follow the steps</li>
                        <li>Copy the API token → paste below → Trackr auto-connects it</li>
                      </ol>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="123456789:ABCdef…"
                          value={telegramToken}
                          onChange={e => setTelegramToken(e.target.value)}
                          className="flex-1 text-sm h-9 font-mono bg-white/80 dark:bg-gray-900/60"
                        />
                        <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white px-4" onClick={saveTelegram} disabled={telegramSaving || !telegramToken.trim()}>
                          {telegramSaving ? '…' : 'Connect'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-9 px-2 text-muted-foreground" onClick={() => set('telegram', 'skipped')}>Skip</Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">After saving, open your bot in Telegram and send <span className="font-mono">/start</span></p>
                    </div>
                  )}
                </div>
              )}

              {/* Email saving spinner */}
              {card.key === 'email' && emailSaving && (
                <div className="px-4 pb-3 text-xs text-muted-foreground">Saving…</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 w-full max-w-md flex flex-col gap-2.5">
        <Button
          className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-500/25 gap-2"
          onClick={onComplete}
        >
          Continue to Dashboard
          <ChevronRight className="w-5 h-5" />
        </Button>
        {!allSettled && (
          <button
            onClick={onComplete}
            className="text-xs text-center text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Skip all — I&apos;ll set up later in Settings
          </button>
        )}
      </div>
    </div>
  )
}
