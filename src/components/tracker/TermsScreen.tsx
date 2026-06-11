'use client'

import React, { useRef, useState } from 'react'
import TrackrLogo from './TrackrLogo'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2 } from 'lucide-react'

interface TermsScreenProps {
  onAccept: () => void
  onDecline: () => void
}

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By creating an account and using Trackr ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the App. These terms apply to all visitors, users, and registered accounts.`,
  },
  {
    title: '2. Description of Service',
    body: `Trackr is a personal finance tracking tool that helps you record income and expenses, set budgets, track goals, and gain spending insights. The App uses artificial intelligence (including Google Gemini and Anthropic Claude) to assist with transaction categorization. Trackr is a productivity tool — it is NOT a licensed financial advisor, bank, investment service, or accounting firm. Nothing in the App constitutes financial, investment, legal, or tax advice.`,
  },
  {
    title: '3. Your Account',
    body: `You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must be at least 13 years old to use Trackr. You agree to provide accurate, complete information during registration and to update it as necessary. Trackr reserves the right to suspend or terminate accounts that violate these terms or are used for fraudulent activity.`,
  },
  {
    title: '4. Data & Privacy',
    body: `Your transaction data, account balances, budgets, and personal settings are stored securely in a cloud database. We do not sell, rent, or share your personal financial data with third parties except as needed to operate the service (e.g., AI categorization APIs). AI categorization sends only the text description of your transaction to the AI provider — no names, emails, or account details are shared. You may delete your account and all associated data at any time by contacting us. For Gemini BYOK (Bring Your Own Key) users, your API key is stored encrypted and used solely to process your own categorization requests.`,
  },
  {
    title: '5. AI-Assisted Features',
    body: `Trackr uses AI to categorize transactions, generate insights, and detect spending patterns. AI categorization is automated and may occasionally be incorrect. You are responsible for reviewing and correcting any misclassified transactions. AI-generated insights and projections are estimates based on your historical data and should not be relied upon as financial forecasts. The Telegram bot integration sends your typed messages to Trackr's servers for processing — do not send sensitive personal or financial account numbers through the bot.`,
  },
  {
    title: '6. Acceptable Use',
    body: `You agree not to: (a) use the App for any unlawful purpose or in violation of any regulations; (b) attempt to gain unauthorized access to any part of the App or its infrastructure; (c) reverse engineer, decompile, or disassemble any part of the App; (d) upload malicious code or interfere with the App's operation; (e) use the App on behalf of another person without their consent; (f) misrepresent your identity or affiliation.`,
  },
  {
    title: '7. Intellectual Property',
    body: `All content, design, code, and trademarks in Trackr are the property of Trackr and its licensors. You are granted a limited, non-exclusive, non-transferable licence to use the App for personal, non-commercial purposes. You may not copy, reproduce, distribute, or create derivative works without written permission.`,
  },
  {
    title: '8. Disclaimer of Warranties',
    body: `The App is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the App will be uninterrupted, error-free, or completely secure. Financial data shown in the App reflects only what you have manually entered — it does not connect to your actual bank accounts unless explicitly integrated.`,
  },
  {
    title: '9. Limitation of Liability',
    body: `To the fullest extent permitted by law, Trackr shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of your use of or inability to use the App. Our total liability for any claim shall not exceed the amount you paid to use the App in the twelve months preceding the claim (or $10 if no payment was made).`,
  },
  {
    title: '10. Changes to Terms',
    body: `We may update these Terms and Conditions from time to time. When we do, we will update the "Last updated" date below and notify you within the App. Continued use of the App after changes constitutes your acceptance of the revised terms.`,
  },
  {
    title: '11. Governing Law',
    body: `These terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through good-faith negotiation first, and if unresolved, through binding arbitration or the courts of competent jurisdiction.`,
  },
  {
    title: '12. Contact',
    body: `For questions about these terms, privacy, or data deletion requests, please contact us through the Settings screen inside the App.`,
  },
]

export default function TermsScreen({ onAccept, onDecline }: TermsScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (atBottom) setScrolledToBottom(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <TrackrLogo size={36} />
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Terms & Conditions</h1>
              <p className="text-xs text-muted-foreground">Last updated: June 2026</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please read these terms carefully before using Trackr. Scroll to the bottom, then tick the checkbox to continue.
          </p>
        </div>

        {/* Scrollable terms */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[380px] overflow-y-auto px-6 py-4 space-y-5 text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed"
        >
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1 text-[13px]">{s.title}</h2>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}

          {/* Fade hint at bottom */}
          <div className="pt-4 pb-2 text-center text-xs text-muted-foreground">
            — End of Terms & Conditions —
          </div>
        </div>

        {/* Agreement + actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div
              className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                agreed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-gray-300 dark:border-gray-600 group-hover:border-emerald-400'
              }`}
              onClick={() => setAgreed(p => !p)}
            >
              {agreed && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed select-none" onClick={() => setAgreed(p => !p)}>
              I have read and agree to the <span className="font-semibold text-gray-900 dark:text-white">Terms and Conditions</span> and understand that Trackr is not a financial advisor.
            </span>
          </label>

          {!scrolledToBottom && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
              ↓ Scroll down to read all terms before agreeing
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-10 text-xs text-muted-foreground"
              onClick={onDecline}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="flex-1 h-10 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40"
              disabled={!agreed}
              onClick={onAccept}
            >
              Agree & Continue →
            </Button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">
            Declining will sign you out. You must agree to use Trackr.
          </p>
        </div>
      </div>
    </div>
  )
}
