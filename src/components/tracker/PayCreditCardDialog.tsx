'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, Loader2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  icon: string
  color: string
}

interface PayCreditCardDialogProps {
  userName?: string
  onSuccess?: () => void
  onClose?: () => void
}

export default function PayCreditCardDialog({ userName, onSuccess, onClose }: PayCreditCardDialogProps) {
  const { currencySymbol } = useCurrency()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceAccountId, setSourceAccountId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Find credit card accounts
  const creditCardAccounts = accounts.filter(a => a.type === 'credit')
  const creditCardAccount = creditCardAccounts[0] // auto-select first
  const sourceAccounts = accounts.filter(a => a.type !== 'credit')

  // Find selected source account
  const selectedSource = accounts.find(a => a.id === sourceAccountId)

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const headers: Record<string, string> = {}
        if (userName) headers['x-username'] = userName
        const response = await fetch('/api/accounts', { headers })
        if (response.ok) {
          const data = await response.json()
          setAccounts(data.accounts || [])
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAccounts()
  }, [userName])

  // Auto-select first source account
  useEffect(() => {
    if (sourceAccounts.length > 0 && !sourceAccountId) {
      // Prefer debit, then cash, then mobile
      const preferred = sourceAccounts.find(a => a.type === 'debit') ||
        sourceAccounts.find(a => a.type === 'cash') ||
        sourceAccounts.find(a => a.type === 'mobile') ||
        sourceAccounts[0]
      setSourceAccountId(preferred.id)
    }
  }, [sourceAccounts, sourceAccountId])

  const handlePay = async () => {
    if (!creditCardAccount || !sourceAccountId || !amount) return

    const payAmount = parseFloat(amount)
    if (isNaN(payAmount) || payAmount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }

    if (selectedSource && selectedSource.type !== 'credit' && selectedSource.balance < payAmount) {
      toast({
        title: 'Insufficient balance',
        description: `${selectedSource.name} only has ${currencySymbol}${selectedSource.balance.toLocaleString()}`,
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName

      const response = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId: sourceAccountId,
          toAccountId: creditCardAccount.id,
          amount: payAmount,
          description: `Credit card payment from ${selectedSource?.name || 'account'}`,
        }),
      })

      if (response.ok) {
        toast({
          title: '💳 Credit Card Payment Successful!',
          description: `Your credit card debt is reduced by ${currencySymbol}${payAmount.toLocaleString()}`,
        })
        setAmount('')
        onSuccess?.()
      } else {
        const data = await response.json()
        toast({ title: data.error || 'Payment failed', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error paying credit card:', error)
      toast({ title: 'Payment failed', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-purple-200 dark:border-purple-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (creditCardAccounts.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            Pay Credit Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center py-4 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No Credit Card Account Found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a credit card account in Account Settings to use this feature.
            </p>
          </div>
          {onClose && (
            <Button variant="outline" className="w-full" onClick={onClose}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const creditBalance = creditCardAccount.balance > 0
    ? creditCardAccount.balance // positive balance means debt owed
    : Math.abs(creditCardAccount.balance)

  const payAmount = parseFloat(amount) || 0

  return (
    <Card className="w-full max-w-md mx-auto border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            Pay Credit Card
          </CardTitle>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Credit Card Info */}
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{creditCardAccount.icon}</span>
            <span className="text-sm font-medium">{creditCardAccount.name}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Outstanding: <span className="font-bold text-purple-700 dark:text-purple-300">{currencySymbol}{creditBalance.toLocaleString()}</span>
          </p>
        </div>

        {/* Source Account */}
        <div>
          <Label className="text-xs text-muted-foreground">Pay From</Label>
          <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
            <SelectTrigger className="mt-1 border-2 border-purple-200 focus:border-purple-500 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/20">
              <SelectValue placeholder="Select source account" />
            </SelectTrigger>
            <SelectContent>
              {sourceAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.icon} {acc.name} ({currencySymbol}{acc.balance.toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSource && payAmount > 0 && selectedSource.type !== 'credit' && (
            <p className={`text-xs mt-1 ${selectedSource.balance < payAmount ? 'text-red-500' : 'text-muted-foreground'}`}>
              Available: {currencySymbol}{selectedSource.balance.toLocaleString()}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <Label className="text-xs text-muted-foreground">Payment Amount</Label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-muted-foreground">{currencySymbol}</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-3xl font-bold w-44 text-center border-2 border-purple-200 focus:border-purple-500 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/20"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Debt Reduction Info */}
        {payAmount > 0 && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                This reduces your credit card debt by {currencySymbol}{payAmount.toLocaleString()}
              </p>
              {creditBalance > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Remaining after payment: {currencySymbol}{Math.max(0, creditBalance - payAmount).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Amount Buttons */}
        {creditBalance > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmount(Math.min(creditBalance, 1000).toString())}
              className="flex-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            >
              {currencySymbol}1,000
            </button>
            <button
              type="button"
              onClick={() => setAmount(Math.min(creditBalance, 5000).toString())}
              className="flex-1 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            >
              {currencySymbol}5,000
            </button>
            <button
              type="button"
              onClick={() => setAmount(creditBalance.toString())}
              className="flex-1 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
            >
              Full ({currencySymbol}{creditBalance.toLocaleString()})
            </button>
          </div>
        )}

        {/* Pay Button */}
        <Button
          type="button"
          onClick={handlePay}
          disabled={isSaving || !amount || !sourceAccountId || payAmount <= 0}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <ArrowRight className="w-4 h-4 mr-2" />
          )}
          Pay {currencySymbol}{payAmount.toLocaleString()} to {creditCardAccount.name}
        </Button>
      </CardContent>
    </Card>
  )
}
