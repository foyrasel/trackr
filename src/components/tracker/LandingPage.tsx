'use client'

import React, { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Mic, Brain, Globe, Shield, BarChart3, Target, Bell, Camera,
  ArrowRight, Check, Star, Smartphone, ChevronDown, Loader2,
  Wallet, HandCoins, FileDown, Moon, Users, Sparkles
} from 'lucide-react'

interface LandingPageProps {
  onLogin: (name: string) => void
}

const features = [
  {
    icon: Mic,
    title: 'Voice-First Input',
    description: 'Just speak naturally — "Spent 500 taka on groceries" or "আয় ১০০০০ টাকা স্যালারি". Trackr understands English and Bangla, powered by AI.',
    color: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  {
    icon: Brain,
    title: 'AI Smart Categorization',
    description: 'Every transaction is automatically categorized and classified as Need, Want, or Ego spending. No manual sorting — AI does it instantly.',
    color: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50 dark:bg-violet-950/30'
  },
  {
    icon: Globe,
    title: '22 Currencies Supported',
    description: 'USD, BDT, INR, EUR, GBP, AED, SGD, and 15 more. Designed for international users — switch currency anytime, everything updates automatically.',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30'
  },
  {
    icon: BarChart3,
    title: 'Spending Psychology',
    description: 'Go beyond numbers. See how you pay — cash vs card vs mobile wallet — and what that reveals about your spending habits and financial personality.',
    color: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30'
  },
  {
    icon: Target,
    title: 'Financial Goals & Budgets',
    description: 'Set savings goals with deadlines, create monthly budgets per category, and get AI-powered budget suggestions based on the 50/30/20 rule.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50 dark:bg-pink-950/30'
  },
  {
    icon: HandCoins,
    title: 'Lend & Borrow Tracker',
    description: 'Track who owes you and who you owe. Set due dates, see overdue alerts, and mark settlements. Never forget a lending or borrowing again.',
    color: 'from-amber-500 to-yellow-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30'
  },
  {
    icon: Bell,
    title: 'Bill Reminders & Notifications',
    description: 'Never miss a bill. Set recurring reminders with urgency levels, get weekly/monthly spending summaries via push notifications.',
    color: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
  {
    icon: Camera,
    title: 'Photo Receipts',
    description: 'Attach receipt photos to any transaction. Snap, upload, and view later. Keep your proof of purchase organized and accessible.',
    color: 'from-teal-500 to-emerald-500',
    bg: 'bg-teal-50 dark:bg-teal-950/30'
  },
  {
    icon: FileDown,
    title: 'Export CSV & PDF',
    description: 'Export your transaction history with full summaries, category breakdowns, and formatted tables. Perfect for tax season or personal records.',
    color: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50 dark:bg-slate-950/30'
  }
]

const stats = [
  { value: '22', label: 'Currencies' },
  { value: '2', label: 'Languages' },
  { value: '16+', label: 'Categories' },
  { value: '5', label: 'Classifications' },
]

const testimonials = [
  {
    name: 'Rahim Uddin',
    location: 'Dhaka, Bangladesh',
    text: 'I just say "খরচ ৩০০ টাকা রিকশা" and it logs it perfectly. Voice input in Bangla is a game changer for me.',
    rating: 5
  },
  {
    name: 'Priya Sharma',
    location: 'Mumbai, India',
    text: 'The spending psychology feature showed me I overspend when using my card vs cash. Changed my habits completely!',
    rating: 5
  },
  {
    name: 'Ahmed Hassan',
    location: 'Dubai, UAE',
    text: 'Multi-currency support is exactly what I needed. I track expenses in AED at home and INR when visiting India.',
    rating: 5
  }
]

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [facebookConfigured, setFacebookConfigured] = useState(false)
  const [showLoginCard, setShowLoginCard] = useState(false)
  const loginRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setGoogleConfigured(process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === 'true')
    setFacebookConfigured(process.env.NEXT_PUBLIC_FACEBOOK_CONFIGURED === 'true')
  }, [])

  const handleDemoLogin = async () => {
    const userName = name.trim() || 'User'
    setIsLoading(true)
    try {
      const result = await signIn('credentials', { name: userName, redirect: false })
      if (result?.ok) {
        onLogin(userName)
      } else {
        onLogin(userName)
      }
    } catch {
      onLogin(userName)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      setIsLoading(false)
    }
  }

  const handleFacebookLogin = async () => {
    setIsLoading(true)
    try {
      await signIn('facebook', { callbackUrl: '/' })
    } catch {
      setIsLoading(false)
    }
  }

  const scrollToLogin = () => {
    setShowLoginCard(true)
    setTimeout(() => {
      loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Trackr</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={scrollToLogin}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Sign In
            </button>
            <Button
              onClick={scrollToLogin}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-200/30 dark:bg-teal-800/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered • Voice-First • International
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
              Track Your Money
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                With Your Voice
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Just say <em>&ldquo;Spent 500 on groceries&rdquo;</em> or <em>&ldquo;আয় ১০০০০ টাকা স্যালারি&rdquo;</em> — Trackr&apos;s AI understands, categorizes, and logs it instantly. Works in 22 currencies, anywhere in the world.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                onClick={scrollToLogin}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-8 py-6 shadow-lg shadow-emerald-500/25"
              >
                Start Free — No Password Needed
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-gray-700 dark:text-gray-300 text-lg px-8 py-6"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See All Features
                <ChevronDown className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stat.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voice Demo Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Speak. Done.
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                No more typing amounts, selecting categories, and picking dates. Just say what you spent and Trackr handles everything. Our AI understands natural language in English and Bangla, extracts the amount, category, spending type, and even classifies it as Need, Want, or Ego.
              </p>
              <div className="space-y-4">
                {[
                  { text: '"Spent 250 on uber"', result: 'Transport • Cash • Want' },
                  { text: '"খরচ ৫০০ টাকা বাজার"', result: 'Groceries • Cash • Need' },
                  { text: '"Income 50000 salary"', result: 'Salary • Bank • Income' },
                ].map((example, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                    <Mic className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{example.text}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">→ {example.result}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-500/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Voice Input Active</p>
                    <p className="text-sm text-emerald-100">Listening...</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-2xl p-5 mb-4 backdrop-blur-sm">
                  <p className="text-lg font-medium">&ldquo;Spent 1200 taka on restaurant dinner&rdquo;</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-emerald-100">Amount</p>
                    <p className="font-bold text-lg">৳1,200</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-emerald-100">Category</p>
                    <p className="font-bold text-lg">Dining</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-emerald-100">Type</p>
                    <p className="font-bold text-lg">Cash</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3">
                    <p className="text-xs text-emerald-100">Class</p>
                    <p className="font-bold text-lg">Want</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need to Stay on Top
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
              9 powerful features designed for real people — not finance experts. Simple, smart, and surprisingly insightful.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-lg transition-all duration-300 group"
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 bg-gradient-to-r ${feature.color} bg-clip-text`} style={{ color: feature.color.includes('emerald') ? '#10b981' : feature.color.includes('violet') ? '#8b5cf6' : feature.color.includes('blue') ? '#3b82f6' : feature.color.includes('orange') ? '#f97316' : feature.color.includes('pink') ? '#ec4899' : feature.color.includes('amber') ? '#f59e0b' : feature.color.includes('indigo') ? '#6366f1' : feature.color.includes('teal') ? '#14b8a6' : '#64748b' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Spending Psychology Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Spending Psychology Report</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Cash Spending</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Conservative & planned</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">62%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">C</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Card Spending</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Impulse & larger amounts</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">28%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-violet-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Mobile Wallet</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Quick & frequent</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-violet-600">10%</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Insight:</strong> You spend 40% more per transaction when using your card vs cash. Consider using cash for discretionary spending.
                  </p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Understand Your
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  Spending Psychology
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                It&apos;s not just about how much you spend — it&apos;s about HOW you spend. Trackr analyzes your payment methods (cash, card, mobile wallet) to reveal behavioral patterns. Do you impulse-buy more with your card? Are mobile wallet purchases smaller but more frequent? Know thyself, financially.
              </p>
              <ul className="space-y-3">
                {[
                  'See spending breakdown by payment method',
                  'Get behavioral insights based on how you pay',
                  'Understand if you\'re a conservative or impulsive spender',
                  'Receive personalized tips to improve habits',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Loved by Real Users</h2>
            <p className="text-gray-600 dark:text-gray-300">See what people are saying about Trackr</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card key={i} className="border border-gray-100 dark:border-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t.location}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Free Section */}
      <section className="py-16 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            100% Free. No Limits. No Ads.
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Trackr is built for real people, not for profit. No premium tiers, no feature gates, no hidden costs. Every feature is free — forever. Your data stays private on your device.
          </p>
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-xl">
              <CardContent className="p-8">
                <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">Free</div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">No credit card required</p>
                <ul className="space-y-3 text-left mb-8">
                  {[
                    'Voice input in English & Bangla',
                    'AI categorization & classification',
                    '22 currencies with auto-conversion',
                    'Unlimited transactions & goals',
                    'Budget tracking & AI suggestions',
                    'Lend/Borrow & Bill Reminders',
                    'Photo receipts & PDF export',
                    'Dark mode & PWA install',
                    'Data stays private on your device',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={scrollToLogin}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6"
                >
                  Get Started Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section ref={loginRef} className="py-16 bg-white dark:bg-gray-950">
        <div className="max-w-sm mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Get Started in 5 Seconds</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">No password needed. Just enter your name.</p>
          </div>

          <Card className="border-2 border-emerald-100 dark:border-emerald-900 shadow-xl">
            <CardContent className="p-6 space-y-4">
              {googleConfigured && (
                <Button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3 text-sm font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  Continue with Google
                </Button>
              )}

              {facebookConfigured && (
                <Button
                  onClick={handleFacebookLogin}
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center gap-3 text-sm font-medium bg-[#1877F2] hover:bg-[#166FE5] text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  Continue with Facebook
                </Button>
              )}

              {(googleConfigured || facebookConfigured) && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-950 px-2 text-muted-foreground">or continue with name</span>
                  </div>
                </div>
              )}

              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()}
                className="h-12 text-center text-lg"
                disabled={isLoading}
              />
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Start Tracking Now
              </Button>

              <div className="flex items-center justify-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Shield className="w-3.5 h-3.5" />
                  Private & Secure
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  Works Offline
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Globe className="w-3.5 h-3.5" />
                  22 Currencies
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">T</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Trackr</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">AI Voice Expense Tracker</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Free & open-source. Your data stays on your device.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
