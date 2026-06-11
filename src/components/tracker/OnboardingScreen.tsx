'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Mic, Banknote, CreditCard, Smartphone, ArrowRight, X, Zap, Clock, TrendingUp, Globe, Check } from 'lucide-react'
import { useCurrency } from './CurrencyContext'
import TrackrLogo from './TrackrLogo'

interface OnboardingScreenProps {
  onComplete: () => void
}

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '\U0001f1fa\U0001f1f8', currency: 'USD ($)' },
  { code: 'bn', label: 'Bangla', nativeLabel: '\u09ac\u09be\u0982\u09b2\u09be', flag: '\U0001f1e7\U0001f1e9', currency: 'BDT (\u09f3)' },
  { code: 'hi', label: 'Hindi', nativeLabel: '\u0939\u093f\u0928\u094d\u0926\u0940', flag: '\U0001f1ee\U0001f1f3', currency: 'INR (\u20b9)' },
]

const screens = [
  {
    id: 0,
    title: 'Tried budgeting apps before?',
    subtitle: 'We get it.',
    description: '67% of people quit within a week. Too many taps, too many categories, too much friction. Not anymore.',
    visual: 'frustration',
  },
  {
    id: 1,
    title: 'Just talk. Trackr listens.',
    subtitle: 'Voice-powered tracking in 5 seconds.',
    description: "Say \"Spent 200 on groceries\" — done. No typing, no categories to pick, no menus to navigate.",
    visual: 'voice',
  },
  {
    id: 2,
    title: 'Cash, Card, or Mobile — we track it all.',
    subtitle: 'Works with any currency, anywhere.',
    description: 'No bank sync required. No broken connections. 50/30/20 budget made simple.',
    visual: 'payment',
  },
  {
    id: 3,
    title: 'Choose your language',
    subtitle: "We'll set the right currency for you.",
    description: 'Trackr speaks your language. Pick one and we\'ll automatically configure the right currency.',
    visual: 'language',
  },
  {
    id: 4,
    title: 'Ready to give tracking another shot?',
    subtitle: 'This time, it sticks.',
    description: 'No credit card. No bank link. No subscription trap. Just start tracking.',
    visual: 'cta',
  },
]

// Frustration illustration: phone with broken entries
function FrustrationVisual() {
  return (
    <div className="relative w-48 h-72 mx-auto">
      {/* Phone frame */}
      <motion.div
        className="absolute inset-0 rounded-3xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {/* Status bar */}
        <div className="h-6 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
        {/* Fake entries with red marks */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="mx-3 mt-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 relative"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
          >
            <div className="h-2 w-16 bg-gray-200 dark:bg-gray-600 rounded mb-1" />
            <div className="h-2 w-24 bg-gray-100 dark:bg-gray-700 rounded" />
            {/* X mark */}
            <motion.div
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.2 + i * 0.1, type: 'spring', stiffness: 500 }}
            >
              <X className="w-3 h-3 text-red-500" />
            </motion.div>
          </motion.div>
        ))}
        {/* Frustrated face */}
        <motion.div
          className="absolute bottom-4 left-0 right-0 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-3xl">😩</span>
          <p className="text-[8px] text-gray-400 mt-1">Too much tapping...</p>
        </motion.div>
      </motion.div>
      {/* Floating frustration marks */}
      {['😤', '🙅', '⏰'].map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-xl"
          style={{ top: `${10 + i * 25}%`, right: i === 1 ? '-10%' : '-5%' }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 + i * 0.2, type: 'spring' }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  )
}

// Voice illustration: microphone with animated waves
function VoiceVisual() {
  return (
    <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
      {/* Animated voice waves */}
      {[1, 2, 3, 4].map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full border-2 border-emerald-400/30"
          style={{
            width: `${60 + ring * 28}px`,
            height: `${60 + ring * 28}px`,
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.1, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: ring * 0.3,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Mic circle */}
      <motion.div
        className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
      >
        <Mic className="w-10 h-10 text-white" />
      </motion.div>
      {/* Floating text bubble */}
      <motion.div
        className="absolute top-2 right-0 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-lg border border-emerald-100 dark:border-emerald-900"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          &quot;Spent 200 on groceries&quot;
        </p>
      </motion.div>
      {/* Speed comparison */}
      <motion.div
        className="absolute -bottom-2 left-0 right-0 flex items-center justify-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3 text-red-500" />
          <span className="text-xs font-medium text-red-600 dark:text-red-400">45 sec manual</span>
        </div>
        <ArrowRight className="w-4 h-4 text-emerald-500" />
        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg px-2 py-1">
          <Zap className="w-3 h-3 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">5 sec voice</span>
        </div>
      </motion.div>
    </div>
  )
}

// Payment methods illustration
function PaymentVisual() {
  const items = [
    { icon: Banknote, label: 'Cash', color: 'from-green-400 to-emerald-500', delay: 0.3 },
    { icon: CreditCard, label: 'Card', color: 'from-blue-400 to-indigo-500', delay: 0.5 },
    { icon: Smartphone, label: 'Mobile', color: 'from-purple-400 to-violet-500', delay: 0.7 },
  ]

  return (
    <div className="relative w-56 h-56 mx-auto flex flex-col items-center justify-center gap-6">
      {/* Payment icons row */}
      <div className="flex items-center gap-4">
        {items.map(({ icon: Icon, label, color, delay }) => (
          <motion.div
            key={label}
            className="flex flex-col items-center gap-2"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay, type: 'spring', stiffness: 200 }}
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
          </motion.div>
        ))}
      </div>
      {/* 50/30/20 bar */}
      <motion.div
        className="w-full max-w-[200px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">50/30/20 Budget</span>
          <TrendingUp className="w-3 h-3 text-emerald-500" />
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700">
          <motion.div
            className="bg-emerald-400 h-full"
            initial={{ width: '0%' }}
            animate={{ width: '50%' }}
            transition={{ delay: 1.3, duration: 0.6 }}
          />
          <motion.div
            className="bg-teal-400 h-full"
            initial={{ width: '0%' }}
            animate={{ width: '30%' }}
            transition={{ delay: 1.5, duration: 0.6 }}
          />
          <motion.div
            className="bg-cyan-400 h-full"
            initial={{ width: '0%' }}
            animate={{ width: '20%' }}
            transition={{ delay: 1.7, duration: 0.6 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-emerald-600 dark:text-emerald-400">Needs</span>
          <span className="text-[8px] text-teal-600 dark:text-teal-400">Wants</span>
          <span className="text-[8px] text-cyan-600 dark:text-cyan-400">Save</span>
        </div>
      </motion.div>
      {/* Currency badge */}
      <motion.div
        className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-3 py-1 border border-emerald-100 dark:border-emerald-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
      >
        <span className="text-xs">🌍</span>
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Works with any currency</span>
      </motion.div>
    </div>
  )
}

// Language selection visual
function LanguageVisual() {
  const { language, setLanguage } = useCurrency()
  const [selectedLang, setSelectedLang] = useState(language)

  const handleSelect = (code: string) => {
    setSelectedLang(code)
    setLanguage(code)
  }

  return (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-4">
      <motion.div
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-2"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <Globe className="w-10 h-10 text-white" />
      </motion.div>

      <div className="w-full space-y-2">
        {LANGUAGES.map((lang, i) => (
          <motion.button
            key={lang.code}
            type="button"
            onClick={() => handleSelect(lang.code)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              selectedLang === lang.code
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 shadow-md'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{lang.nativeLabel}</p>
              <p className="text-xs text-muted-foreground">{lang.label} &middot; {lang.currency}</p>
            </div>
            {selectedLang === lang.code && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <Check className="w-5 h-5 text-emerald-600" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// CTA visual
function CtaVisual() {
  return (
    <div className="relative w-56 h-48 mx-auto flex flex-col items-center justify-center">
      {/* Trackr logo large */}
      <motion.div
        className="mb-4"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
      >
        <TrackrLogo size={88} />
      </motion.div>
      {/* Trust badges */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-2 mt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {[
          { icon: '🔒', text: 'No credit card' },
          { icon: '🏦', text: 'No bank link' },
          { icon: '💎', text: 'No subscription trap' },
        ].map((badge, i) => (
          <motion.div
            key={badge.text}
            className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-full px-2.5 py-1 border border-gray-100 dark:border-gray-700"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 + i * 0.15 }}
          >
            <span className="text-xs">{badge.icon}</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{badge.text}</span>
          </motion.div>
        ))}
      </motion.div>
      {/* Sparkle decorations */}
      {[
        { top: '5%', left: '10%', delay: 0.5 },
        { top: '15%', right: '5%', delay: 0.7 },
        { bottom: '20%', left: '5%', delay: 0.9 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute text-lg"
          style={{ top: pos.top, left: pos.left, right: pos.right }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: pos.delay,
          }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  )
}

function getVisual(visualType: string) {
  switch (visualType) {
    case 'frustration': return <FrustrationVisual />
    case 'voice': return <VoiceVisual />
    case 'payment': return <PaymentVisual />
    case 'language': return <LanguageVisual />
    case 'cta': return <CtaVisual />
    default: return null
  }
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [direction, setDirection] = useState(1)

  const handleComplete = useCallback(() => {
    localStorage.setItem('trackr_onboarding_done', 'true')
    onComplete()
  }, [onComplete])

  const goNext = useCallback(() => {
    if (currentScreen < screens.length - 1) {
      setDirection(1)
      setCurrentScreen(prev => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentScreen, handleComplete])

  const goPrev = useCallback(() => {
    if (currentScreen > 0) {
      setDirection(-1)
      setCurrentScreen(prev => prev - 1)
    }
  }, [currentScreen])

  const handleSkip = useCallback(() => {
    handleComplete()
  }, [handleComplete])

  const screen = screens[currentScreen]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-950 dark:to-emerald-950/20 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Skip
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentScreen}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="w-full max-w-sm flex flex-col items-center text-center"
          >
            {/* Visual */}
            <div className="mb-6 min-h-[220px] flex items-center justify-center overflow-visible">
              {getVisual(screen.visual)}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
              {screen.title}
            </h2>

            {/* Subtitle / highlight */}
            <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mb-3">
              {screen.subtitle}
            </p>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              {screen.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="pb-8 pt-4 px-6">
        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentScreen ? 1 : -1)
                setCurrentScreen(i)
              }}
              className="transition-all duration-300 rounded-full"
            >
              <motion.div
                className={`rounded-full ${
                  i === currentScreen
                    ? 'bg-emerald-500 w-6 h-2'
                    : 'bg-gray-300 dark:bg-gray-600 w-2 h-2'
                }`}
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          {currentScreen > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goPrev}
              className="h-12 px-5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back
            </motion.button>
          )}

          {currentScreen < screens.length - 1 ? (
            <Button
              onClick={goNext}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base rounded-xl shadow-xl shadow-emerald-500/30"
            >
              Start Tracking — It&apos;s Free
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
