'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import TrackrLogo from './TrackrLogo'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Banknote, Building2, Smartphone, Plus, X, ArrowRight, ArrowLeft, Check, Sparkles, Wallet } from 'lucide-react'
import { useCurrency } from './CurrencyContext'

interface AccountSetupProps {
  onComplete: (accounts: SetupAccount[]) => void
  onSkip: () => void
  userName?: string
}

interface SetupAccount {
  name: string
  type: string
  balance: number
  color: string
  icon: string
}

const CASH_PRESETS = [
  { name: 'Cash', icon: '💵', color: '#10b981' },
]

const BANK_PRESETS = [
  { name: 'DBBL', icon: '🏦', color: '#3b82f6' },
  { name: 'BRAC', icon: '🏦', color: '#ef4444' },
  { name: 'City Bank', icon: '🏦', color: '#8b5cf6' },
  { name: 'Standard Chartered', icon: '🏦', color: '#f59e0b' },
  { name: 'HSBC', icon: '🏦', color: '#ec4899' },
  { name: 'Sonali Bank', icon: '🏦', color: '#06b6d4' },
]

const WALLET_PRESETS = [
  { name: 'bKash', icon: '📱', color: '#e91e63' },
  { name: 'Nagad', icon: '📱', color: '#f97316' },
  { name: 'Rocket', icon: '📱', color: '#8b5cf6' },
  { name: 'Upay', icon: '📱', color: '#06b6d4' },
]

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

const STEPS = [
  { id: 0, title: 'Cash Balance', subtitle: 'How much cash do you have right now?', icon: Banknote, emoji: '💵' },
  { id: 1, title: 'Bank Accounts', subtitle: 'Add your bank accounts', icon: Building2, emoji: '🏦' },
  { id: 2, title: 'Mobile Wallets', subtitle: 'Add your mobile wallet accounts', icon: Smartphone, emoji: '📱' },
  { id: 3, title: 'All Set!', subtitle: "Here's your financial snapshot", icon: Wallet, emoji: '🎉' },
]

export default function AccountSetup({ onComplete, onSkip, userName }: AccountSetupProps) {
  const { currencySymbol } = useCurrency()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)

  // Cash
  const [cashBalance, setCashBalance] = useState('')

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<{ name: string; balance: string; custom?: boolean }[]>([])
  const [newBankName, setNewBankName] = useState('')
  const [newBankBalance, setNewBankBalance] = useState('')

  // Mobile wallets
  const [walletAccounts, setWalletAccounts] = useState<{ name: string; balance: string; custom?: boolean }[]>([])
  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletBalance, setNewWalletBalance] = useState('')

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    } else {
      handleFinish()
    }
  }

  const goPrev = () => {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const addBankAccount = (name: string) => {
    if (!bankAccounts.find(b => b.name === name)) {
      setBankAccounts([...bankAccounts, { name, balance: '' }])
    }
  }

  const addCustomBank = () => {
    const trimmed = newBankName.trim()
    if (trimmed && !bankAccounts.find(b => b.name === trimmed)) {
      setBankAccounts([...bankAccounts, { name: trimmed, balance: newBankBalance, custom: true }])
      setNewBankName('')
      setNewBankBalance('')
    }
  }

  const removeBank = (name: string) => {
    setBankAccounts(bankAccounts.filter(b => b.name !== name))
  }

  const updateBankBalance = (name: string, balance: string) => {
    setBankAccounts(bankAccounts.map(b => b.name === name ? { ...b, balance } : b))
  }

  const addWalletAccount = (name: string) => {
    if (!walletAccounts.find(w => w.name === name)) {
      setWalletAccounts([...walletAccounts, { name, balance: '' }])
    }
  }

  const addCustomWallet = () => {
    const trimmed = newWalletName.trim()
    if (trimmed && !walletAccounts.find(w => w.name === trimmed)) {
      setWalletAccounts([...walletAccounts, { name: trimmed, balance: newWalletBalance, custom: true }])
      setNewWalletName('')
      setNewWalletBalance('')
    }
  }

  const removeWallet = (name: string) => {
    setWalletAccounts(walletAccounts.filter(w => w.name !== name))
  }

  const updateWalletBalance = (name: string, balance: string) => {
    setWalletAccounts(walletAccounts.map(w => w.name === name ? { ...w, balance } : w))
  }

  const totalBalance = useMemo(() => {
    let total = parseFloat(cashBalance) || 0
    bankAccounts.forEach(b => { total += parseFloat(b.balance) || 0 })
    walletAccounts.forEach(w => { total += parseFloat(w.balance) || 0 })
    return total
  }, [cashBalance, bankAccounts, walletAccounts])

  const handleFinish = () => {
    const accounts: SetupAccount[] = []

    // Cash account (always added)
    accounts.push({
      name: 'Cash',
      type: 'cash',
      balance: parseFloat(cashBalance) || 0,
      color: '#10b981',
      icon: '💵',
    })

    // Bank accounts
    bankAccounts.forEach(bank => {
      const preset = BANK_PRESETS.find(p => p.name === bank.name)
      accounts.push({
        name: bank.name,
        type: 'debit',
        balance: parseFloat(bank.balance) || 0,
        color: preset?.color || '#3b82f6',
        icon: preset?.icon || '🏦',
      })
    })

    // Mobile wallets
    walletAccounts.forEach(wallet => {
      const preset = WALLET_PRESETS.find(p => p.name === wallet.name)
      accounts.push({
        name: wallet.name,
        type: 'mobile',
        balance: parseFloat(wallet.balance) || 0,
        color: preset?.color || '#a855f7',
        icon: preset?.icon || '📱',
      })
    })

    onComplete(accounts)
  }

  const step = STEPS[currentStep]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-950 dark:to-emerald-950/20 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <TrackrLogo size={32} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Setup</span>
        </div>
        <button
          onClick={onSkip}
          className="text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Skip for now
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-4">
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col px-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="flex-1 flex flex-col"
          >
            {/* Step Header */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">{step.emoji}</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{step.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>
            </div>

            {/* Step Content */}
            {currentStep === 0 && (
              /* Cash Balance Step */
              <div className="flex-1 flex flex-col items-center">
                <Card className="w-full max-w-sm border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <Banknote className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Cash on Hand</p>
                        <p className="text-xs text-muted-foreground">Physical cash you have right now</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-emerald-600">{currencySymbol}</span>
                      <Input
                        type="number"
                        placeholder="0"
                        value={cashBalance}
                        onChange={(e) => setCashBalance(e.target.value)}
                        className="text-3xl font-bold h-14 border-2 focus:border-emerald-500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </CardContent>
                </Card>
                <p className="text-xs text-muted-foreground mt-4 text-center max-w-xs">
                  Don&apos;t worry about being exact — you can always adjust later
                </p>
              </div>
            )}

            {currentStep === 1 && (
              /* Bank Accounts Step */
              <div className="flex-1 flex flex-col items-center space-y-4 max-h-[400px] overflow-y-auto px-1 pb-2 w-full">
                {/* Quick-add presets */}
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick add popular banks:</p>
                  <div className="flex flex-wrap gap-2">
                    {BANK_PRESETS.map(bank => {
                      const isAdded = bankAccounts.some(b => b.name === bank.name)
                      return (
                        <button
                          key={bank.name}
                          onClick={() => !isAdded && addBankAccount(bank.name)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isAdded
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {bank.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom bank input */}
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Or add a custom bank:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Bank name"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      className="text-sm h-9"
                    />
                    <Input
                      placeholder="Balance"
                      type="number"
                      value={newBankBalance}
                      onChange={(e) => setNewBankBalance(e.target.value)}
                      className="text-sm h-9 w-24"
                      min="0"
                      step="0.01"
                    />
                    <Button
                      onClick={addCustomBank}
                      disabled={!newBankName.trim()}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Added bank accounts with balance inputs */}
                {bankAccounts.length > 0 && (
                  <div className="w-full max-w-sm space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Your bank accounts:</p>
                    {bankAccounts.map(bank => {
                      const preset = BANK_PRESETS.find(p => p.name === bank.name)
                      return (
                        <Card key={bank.name} className="border border-gray-200 dark:border-gray-700">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: preset?.color || '#3b82f6' }}
                            >
                              {bank.name[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{bank.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={bank.balance}
                                onChange={(e) => updateBankBalance(bank.name, e.target.value)}
                                className="text-sm h-8 w-24"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <button
                              onClick={() => removeBank(bank.name)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {bankAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No bank accounts added yet. Tap a bank above to add it.
                  </p>
                )}
              </div>
            )}

            {currentStep === 2 && (
              /* Mobile Wallets Step */
              <div className="flex-1 flex flex-col items-center space-y-4 max-h-[400px] overflow-y-auto px-1 pb-2 w-full">
                {/* Quick-add presets */}
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Quick add popular wallets:</p>
                  <div className="flex flex-wrap gap-2">
                    {WALLET_PRESETS.map(wallet => {
                      const isAdded = walletAccounts.some(w => w.name === wallet.name)
                      return (
                        <button
                          key={wallet.name}
                          onClick={() => !isAdded && addWalletAccount(wallet.name)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isAdded
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {wallet.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom wallet input */}
                <div className="w-full max-w-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Or add a custom wallet:</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Wallet name"
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      className="text-sm h-9"
                    />
                    <Input
                      placeholder="Balance"
                      type="number"
                      value={newWalletBalance}
                      onChange={(e) => setNewWalletBalance(e.target.value)}
                      className="text-sm h-9 w-24"
                      min="0"
                      step="0.01"
                    />
                    <Button
                      onClick={addCustomWallet}
                      disabled={!newWalletName.trim()}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Added wallet accounts with balance inputs */}
                {walletAccounts.length > 0 && (
                  <div className="w-full max-w-sm space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Your wallets:</p>
                    {walletAccounts.map(wallet => {
                      const preset = WALLET_PRESETS.find(p => p.name === wallet.name)
                      return (
                        <Card key={wallet.name} className="border border-gray-200 dark:border-gray-700">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: preset?.color || '#a855f7' }}
                            >
                              {wallet.name[0]}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{wallet.name}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">{currencySymbol}</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={wallet.balance}
                                onChange={(e) => updateWalletBalance(wallet.name, e.target.value)}
                                className="text-sm h-8 w-24"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <button
                              onClick={() => removeWallet(wallet.name)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {walletAccounts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No mobile wallets added yet. Tap a wallet above to add it.
                  </p>
                )}
              </div>
            )}

            {currentStep === 3 && (
              /* Summary Step */
              <div className="flex-1 flex flex-col items-center">
                {/* Total Balance Card */}
                <Card className="w-full max-w-sm border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 mb-4">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Total Across All Accounts</p>
                    <p className="text-4xl font-bold text-emerald-700 dark:text-emerald-300">
                      {currencySymbol}{totalBalance.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>

                {/* Breakdown */}
                <div className="w-full max-w-sm space-y-2">
                  {/* Cash */}
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium flex-1">Cash</span>
                      <span className="text-sm font-bold">{currencySymbol}{(parseFloat(cashBalance) || 0).toLocaleString()}</span>
                    </CardContent>
                  </Card>

                  {/* Banks */}
                  {bankAccounts.map(bank => {
                    const preset = BANK_PRESETS.find(p => p.name === bank.name)
                    return (
                      <Card key={bank.name} className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: preset?.color || '#3b82f6' }}
                          >
                            {bank.name[0]}
                          </div>
                          <span className="text-sm font-medium flex-1">{bank.name}</span>
                          <span className="text-sm font-bold">{currencySymbol}{(parseFloat(bank.balance) || 0).toLocaleString()}</span>
                        </CardContent>
                      </Card>
                    )
                  })}

                  {/* Wallets */}
                  {walletAccounts.map(wallet => {
                    const preset = WALLET_PRESETS.find(p => p.name === wallet.name)
                    return (
                      <Card key={wallet.name} className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: preset?.color || '#a855f7' }}
                          >
                            {wallet.name[0]}
                          </div>
                          <span className="text-sm font-medium flex-1">{wallet.name}</span>
                          <span className="text-sm font-bold">{currencySymbol}{(parseFloat(wallet.balance) || 0).toLocaleString()}</span>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Encouragement message */}
      <div className="px-6 py-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-2.5 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 dark:text-emerald-300 text-center">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Track where your money lives — 80% of users who set up accounts stick with tracking longer!
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pb-8 pt-4 px-6">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          {currentStep > 0 && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goPrev}
              className="h-12 px-5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1 inline" />
              Back
            </motion.button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={goNext}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-base rounded-xl shadow-xl shadow-emerald-500/30"
            >
              <Check className="w-5 h-5 mr-1" />
              Start Tracking!
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
