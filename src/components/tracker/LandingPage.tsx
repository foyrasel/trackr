'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Mic, Brain, Globe, Shield, BarChart3, Target, Bell, Camera,
  ArrowRight, Check, Star, Smartphone, ChevronDown,
  Wallet, HandCoins, FileDown, Moon, Users, Sparkles,
  TrendingUp, PiggyBank, Receipt, Zap
} from 'lucide-react'
import AuthModal from './AuthModal'

interface LandingPageProps {
  onLogin: (name: string, email?: string | null, userId?: string | null) => void
}

const features = [
  {
    icon: Mic,
    title: 'Voice-First Input',
    description: 'Just speak naturally — "Spent 500 taka on groceries" or "আয় ১০০০০ টাকা স্যালারি" or "खर्च ५०० रुपये बाजार". Trackr understands English, Bangla, and Hindi, powered by AI.',
    gradient: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-500/20',
    iconColor: '#10b981'
  },
  {
    icon: Brain,
    title: 'AI Smart Categorization',
    description: 'Every transaction is automatically categorized and classified as Need, Want, or Ego spending. No manual sorting — AI does it instantly.',
    gradient: 'from-violet-500 to-purple-500',
    glow: 'shadow-violet-500/20',
    iconColor: '#8b5cf6'
  },
  {
    icon: Globe,
    title: 'Multi-Currency Support',
    description: 'Track expenses in USD, BDT, INR, EUR, GBP, AED, and more. Switch currency anytime — everything updates automatically.',
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'shadow-cyan-500/20',
    iconColor: '#06b6d4'
  },
  {
    icon: BarChart3,
    title: 'Spending Psychology',
    description: 'Go beyond numbers. See how you pay — cash vs card vs mobile wallet — and what that reveals about your spending habits and financial personality.',
    gradient: 'from-orange-500 to-red-500',
    glow: 'shadow-orange-500/20',
    iconColor: '#f97316'
  },
  {
    icon: Target,
    title: 'Financial Goals & Budgets',
    description: 'Set savings goals with deadlines, create monthly budgets per category, and get AI-powered budget suggestions based on the 50/30/20 rule.',
    gradient: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-500/20',
    iconColor: '#ec4899'
  },
  {
    icon: HandCoins,
    title: 'Lend & Borrow Tracker',
    description: 'Track who owes you and who you owe. Set due dates, see overdue alerts, and mark settlements. Never forget a lending or borrowing again.',
    gradient: 'from-amber-500 to-yellow-500',
    glow: 'shadow-amber-500/20',
    iconColor: '#f59e0b'
  },
  {
    icon: Bell,
    title: 'Bill Reminders & Notifications',
    description: 'Never miss a bill. Set recurring reminders with urgency levels, get weekly/monthly spending summaries via push notifications.',
    gradient: 'from-rose-500 to-pink-500',
    glow: 'shadow-rose-500/20',
    iconColor: '#f43f5e'
  },
  {
    icon: Camera,
    title: 'Photo Receipts',
    description: 'Attach receipt photos to any transaction. Snap, upload, and view later. Keep your proof of purchase organized and accessible.',
    gradient: 'from-teal-500 to-emerald-500',
    glow: 'shadow-teal-500/20',
    iconColor: '#14b8a6'
  },
  {
    icon: FileDown,
    title: 'Export CSV & PDF',
    description: 'Export your transaction history with full summaries, category breakdowns, and formatted tables. Perfect for tax season or personal records.',
    gradient: 'from-slate-500 to-gray-600',
    glow: 'shadow-slate-500/20',
    iconColor: '#64748b'
  }
]

const stats = [
  { value: '7+', label: 'Currencies', icon: Globe },
  { value: '3', label: 'Languages', icon: Mic },
  { value: '16+', label: 'Categories', icon: Brain },
  { value: '5', label: 'Classifications', icon: BarChart3 },
]

const testimonials = [
  {
    name: 'Rahim Uddin',
    location: 'Dhaka, Bangladesh',
    text: 'I just say "খরচ ৩০০ টাকা রিকশা" and it logs it perfectly. Voice input in Bangla is a game changer for me.',
    rating: 5,
    emoji: '🇧🇩'
  },
  {
    name: 'Priya Sharma',
    location: 'Mumbai, India',
    text: 'The spending psychology feature showed me I overspend when using my card vs cash. Changed my habits completely!',
    rating: 5,
    emoji: '🇮🇳'
  },
  {
    name: 'Ahmed Hassan',
    location: 'Dubai, UAE',
    text: 'Multi-currency support is exactly what I needed. I track expenses in AED at home and INR when visiting India.',
    rating: 5,
    emoji: '🇦🇪'
  }
]

// Animated section wrapper
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Floating blob component
function FloatingBlob({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-60 dark:opacity-30 ${className}`}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -30, 20, 0],
        scale: [1, 1.1, 0.95, 1],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  )
}

// Phone mockup component
function PhoneMockup() {
  return (
    <motion.div
      className="relative mx-auto w-[280px] sm:w-[300px]"
      initial={{ opacity: 0, y: 60, rotateY: -10 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {/* Glow behind phone */}
      <div className="absolute -inset-8 bg-gradient-to-r from-emerald-400/30 to-teal-400/30 dark:from-emerald-500/20 dark:to-teal-500/20 rounded-[3rem] blur-2xl" />

      {/* Phone frame */}
      <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl shadow-gray-900/50 ring-1 ring-white/10">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-10" />

        {/* Screen */}
        <div className="relative bg-gradient-to-b from-emerald-600 to-teal-700 rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-8 pb-2">
            <span className="text-white/80 text-[10px] font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1.5 rounded-sm border border-white/60" />
              <div className="w-3 h-2 rounded-sm border border-white/60">
                <div className="w-1.5 h-full bg-white/80 rounded-sm ml-auto" />
              </div>
            </div>
          </div>

          {/* App content */}
          <div className="px-5 pb-6 pt-2">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-emerald-100 text-[10px]">Good evening</p>
                <p className="text-white font-bold text-sm">Rahim</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Balance card */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/10">
              <p className="text-emerald-100 text-[10px] mb-1">Total Balance</p>
              <p className="text-white font-bold text-2xl">৳45,230</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <span className="text-emerald-300 text-[10px] font-medium">+12.5% this month</span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { icon: Mic, label: 'Voice' },
                { icon: PiggyBank, label: 'Goals' },
                { icon: Receipt, label: 'Bills' },
              ].map((action) => (
                <div key={action.label} className="bg-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1 border border-white/5">
                  <action.icon className="w-4 h-4 text-white" />
                  <span className="text-white text-[9px] font-medium">{action.label}</span>
                </div>
              ))}
            </div>

            {/* Recent transactions */}
            <div className="space-y-2">
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wider">Recent</p>
              {[
                { name: 'Groceries', amount: '-৳850', icon: '🛒', color: 'bg-emerald-400/20' },
                { name: 'Salary', amount: '+৳50,000', icon: '💰', color: 'bg-emerald-400/20' },
                { name: 'Uber', amount: '-৳250', icon: '🚗', color: 'bg-amber-400/20' },
              ].map((tx) => (
                <div key={tx.name} className="flex items-center justify-between bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${tx.color} flex items-center justify-center text-sm`}>
                      {tx.icon}
                    </div>
                    <div>
                      <p className="text-white text-[11px] font-medium">{tx.name}</p>
                      <p className="text-white/50 text-[9px]">Today</p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold ${tx.amount.startsWith('+') ? 'text-emerald-300' : 'text-white/90'}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="bg-black/20 backdrop-blur-sm px-6 py-3 flex items-center justify-around border-t border-white/5">
            {[Wallet, BarChart3, Zap, Users].map((Icon, i) => (
              <Icon key={i} className={`w-4 h-4 ${i === 0 ? 'text-white' : 'text-white/40'}`} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [isSeeding, setIsSeeding] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login')

  const heroRef = useRef<HTMLDivElement>(null)

  // Parallax scroll
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  // Seed test users on every app start (idempotent).
  useEffect(() => {
    fetch('/api/seed', { method: 'POST' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          localStorage.setItem('trackr_seeded', 'true')
        }
      })
      .catch(() => {})
      .finally(() => setIsSeeding(false))
  }, [])

  // Suppress unused warning — isSeeding retained for future use / seed indicator
  void isSeeding

  const openLogin = () => { setAuthModalMode('login'); setAuthModalOpen(true) }
  const openSignup = () => { setAuthModalMode('signup'); setAuthModalOpen(true) }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">
      {/* Navigation Bar */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-shadow">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Trackr</span>
          </a>
          <div className="hidden sm:flex items-center gap-6">
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Reviews
            </button>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Pricing
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openLogin}
              className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Log In
            </button>
            <Button
              onClick={openSignup}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm px-5 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ===== HERO SECTION ===== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Rich gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20" />

        {/* Animated gradient blobs */}
        <FloatingBlob className="w-[500px] h-[500px] bg-gradient-to-r from-emerald-300/40 to-teal-300/40 dark:from-emerald-700/20 dark:to-teal-700/20 -top-20 -left-40" delay={0} />
        <FloatingBlob className="w-[600px] h-[600px] bg-gradient-to-r from-teal-200/30 to-cyan-200/30 dark:from-teal-800/15 dark:to-cyan-800/15 -bottom-40 -right-40" delay={3} />
        <FloatingBlob className="w-[300px] h-[300px] bg-gradient-to-r from-emerald-200/30 to-green-200/30 dark:from-emerald-900/20 dark:to-green-900/20 top-1/3 right-1/4" delay={6} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:60px_60px] dark:bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)]" />

        <motion.div
          className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-emerald-200/50 dark:border-emerald-800/50"
              >
                <Sparkles className="w-4 h-4" />
                AI-Powered &bull; Voice-First &bull; Free Forever
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.1] mb-6 tracking-tight"
              >
                Track Your
                <br />
                Money{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">
                  With Your Voice
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Just say <em className="not-italic text-emerald-700 dark:text-emerald-400 font-medium">&ldquo;Spent 500 on groceries&rdquo;</em> or <em className="not-italic text-emerald-700 dark:text-emerald-400 font-medium">&ldquo;আয় ১০০০০ টাকা স্যালারি&rdquo;</em> — Trackr&apos;s AI understands, categorizes, and logs it instantly.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center gap-4 mb-12 lg:justify-start justify-center"
              >
                <Button
                  onClick={openSignup}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg px-8 py-7 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all group"
                >
                  Start Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-gray-700 dark:text-gray-300 text-lg px-8 py-7 border-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  See All Features
                  <ChevronDown className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-lg mx-auto lg:mx-0"
              >
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center lg:text-left">
                    <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{stat.value}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ===== VOICE DEMO SECTION ===== */}
      <section className="relative py-24 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-950 dark:to-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5" />
                Voice Input
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Speak.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                  Done.
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                No more typing amounts, selecting categories, and picking dates. Just say what you spent and Trackr handles everything. Our AI understands natural language in English, Bangla, and Hindi.
              </p>
              <div className="space-y-4">
                {[
                  { text: '"Spent 250 on uber"', result: 'Transport • Cash • Want', color: 'border-l-4 border-l-emerald-500' },
                  { text: '"খরচ ৫০০ টাকা বাজার"', result: 'Groceries • Cash • Need', color: 'border-l-4 border-l-teal-500' },
                  { text: '"खर्च ५०० रुपये बाजार"', result: 'Groceries • Cash • Need', color: 'border-l-4 border-l-violet-500' },
                  { text: '"Income 50000 salary"', result: 'Salary • Bank • Income', color: 'border-l-4 border-l-cyan-500' },
                ].map((example, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.5 }}
                    className={`flex items-start gap-3 bg-white dark:bg-gray-800/80 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 ${example.color} hover:shadow-md transition-shadow`}
                  >
                    <Mic className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{example.text}</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">&rarr; {example.result}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="relative">
                {/* Voice demo card */}
                <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-8 text-white shadow-2xl shadow-emerald-500/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Voice Input Active</p>
                      <p className="text-sm text-emerald-100">Listening...</p>
                    </div>
                    <div className="ml-auto flex gap-1">
                      {[...Array(4)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-white/60 rounded-full"
                          animate={{ height: [8, 20 + i * 5, 8] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-5 mb-4 backdrop-blur-sm border border-white/10">
                    <p className="text-lg font-medium">&ldquo;Spent 1200 taka on restaurant dinner&rdquo;</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Amount', value: '৷1,200' },
                      { label: 'Category', value: 'Dining' },
                      { label: 'Type', value: 'Cash' },
                      { label: 'Class', value: 'Want' },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                        <p className="text-xs text-emerald-100">{item.label}</p>
                        <p className="font-bold text-lg">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-400/20 rounded-full blur-xl" />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="relative py-24 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Features
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
              Everything You Need
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                to Stay on Top
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
              9 powerful features designed for real people — not finance experts. Simple, smart, and surprisingly insightful.
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <Card className="group relative overflow-hidden border border-gray-100 dark:border-gray-800/80 hover:border-emerald-200 dark:hover:border-emerald-700/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm h-full">
                  {/* Gradient glow on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                  <CardContent className="relative p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg ${feature.glow} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SPENDING PSYCHOLOGY SECTION ===== */}
      <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-200/20 to-red-200/20 dark:from-orange-900/10 dark:to-red-900/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection className="order-2 lg:order-1">
              <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Spending Psychology Report</h3>
                <div className="space-y-4">
                  {[
                    { icon: Wallet, label: 'Cash Spending', sub: 'Conservative & planned', pct: '62%', color: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600', barColor: 'bg-emerald-500', barWidth: '62%' },
                    { icon: Smartphone, label: 'Card Spending', sub: 'Impulse & larger amounts', pct: '28%', color: 'bg-blue-50 dark:bg-blue-950/30', iconColor: 'text-blue-600', barColor: 'bg-blue-500', barWidth: '28%' },
                    { icon: Smartphone, label: 'Mobile Wallet', sub: 'Quick & frequent', pct: '10%', color: 'bg-violet-50 dark:bg-violet-950/30', iconColor: 'text-violet-600', barColor: 'bg-violet-500', barWidth: '10%' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-4 rounded-xl ${item.color}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.sub}</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold ${item.iconColor}`}>{item.pct}</span>
                      </div>
                      <div className="w-full h-2 bg-white/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${item.barColor} rounded-full`}
                          initial={{ width: 0 }}
                          whileInView={{ width: item.barWidth }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-5 p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Insight:</strong> You spend 40% more per transaction when using your card vs cash. Consider using cash for discretionary spending.
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection className="order-1 lg:order-2" delay={0.2}>
              <div className="inline-flex items-center gap-2 bg-orange-100/80 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5" />
                Psychology
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">
                Understand Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                  Spending Psychology
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-lg">
                It&apos;s not just about how much you spend — it&apos;s about <strong className="text-gray-900 dark:text-white">HOW</strong> you spend. Trackr analyzes your payment methods to reveal behavioral patterns.
              </p>
              <ul className="space-y-4">
                {[
                  'See spending breakdown by payment method',
                  'Get behavioral insights based on how you pay',
                  'Understand if you\'re a conservative or impulsive spender',
                  'Receive personalized tips to improve habits',
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-300">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="relative py-24 bg-white dark:bg-gray-950 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Star className="w-3.5 h-3.5" />
              Reviews
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
              Loved by{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                Real Users
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">See what people are saying about Trackr</p>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Card className="h-full bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-100 dark:border-gray-800/80 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-500 group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <span className="text-sm font-bold text-white">{t.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <span>{t.emoji}</span> {t.location}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING / FREE SECTION ===== */}
      <section id="pricing" className="relative py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-teal-50/30 to-white dark:from-gray-900 dark:via-gray-950 dark:to-gray-950" />
        <FloatingBlob className="w-[400px] h-[400px] bg-emerald-300/20 dark:bg-emerald-800/10 -top-20 -left-40" delay={2} />
        <FloatingBlob className="w-[300px] h-[300px] bg-teal-300/20 dark:bg-teal-800/10 -bottom-20 -right-20" delay={5} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Pricing
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
              100% Free.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                No Limits.
              </span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
              Trackr is built for real people, not for profit. No premium tiers, no feature gates, no hidden costs. Every feature is free — forever.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="max-w-md mx-auto">
              <Card className="relative border-2 border-emerald-200 dark:border-emerald-800/50 shadow-2xl shadow-emerald-500/10 overflow-hidden">
                {/* Glow effect */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl" />

                <CardContent className="relative p-8">
                  <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 mb-2">Free</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">No credit card required</p>
                  <ul className="space-y-3 text-left mb-8">
                    {[
                      'Voice input in English, Bangla & Hindi',
                      'AI categorization & classification',
                      'Multi-currency with auto-conversion',
                      'Unlimited transactions & goals',
                      'Budget tracking & AI suggestions',
                      'Lend/Borrow & Bill Reminders',
                      'Photo receipts & PDF export',
                      'Dark mode & PWA install',
                      'Data stays private on your device',
                    ].map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                  <Button
                    onClick={openSignup}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-lg py-7 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all group"
                  >
                    Get Started Now
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <span className="text-white text-sm font-bold">T</span>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Trackr</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                AI-powered voice-first expense tracker. Free, private, and supports multiple currencies.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Voice Input', 'Currencies', 'Budgets'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Features</h4>
              <ul className="space-y-2">
                {['AI Categorization', 'Spending Psychology', 'Lend & Borrow', 'Bill Reminders'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Company</h4>
              <ul className="space-y-2">
                {['About', 'Privacy', 'Terms', 'Contact'].map((item) => (
                  <li key={item}>
                    <span className="text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-default">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} Trackr. Free &amp; open-source. Your data stays on your device.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Moon className="w-3.5 h-3.5" />
                Dark Mode Ready
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile First
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
        onLogin={onLogin}
      />
    </div>
  )
}
