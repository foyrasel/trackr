'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowRightLeft, ArrowDownRight, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color: string
  icon: string
}

interface TransferDialogProps {
  accounts: Account[]
  userName?: string
  onTransferComplete?: () => void
}

export default function TransferDialog({ accounts, userName, onTransferComplete }: TransferDialogProps) {
  const { currencySymbol } = useCurrency()
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [open, setOpen] = useState(false)

  const fromAccount = accounts.find(a => a.id === fromAccountId)
  const toAccount = accounts.find(a => a.id === toAccountId)

  useEffect(() => {
    if (open && accounts.length >= 2) {
      setFromAccountId(accounts[0].id)
      setToAccountId(accounts[1].id)
    }
  }, [open, accounts])

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) return

    const transferAmount = parseFloat(amount)
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' })
      return
    }

    if (fromAccountId === toAccountId) {
      toast({ title: 'Cannot transfer to the same account', variant: 'destructive' })
      return
    }

    if (fromAccount && fromAccount.type !== 'credit' && fromAccount.balance < transferAmount) {
      toast({ title: 'Insufficient balance', description: `${fromAccount.name} only has ${currencySymbol}${fromAccount.balance.toLocaleString()}`, variant: 'destructive' })
      return
    }

    setIsTransferring(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }

      const response = await fetch('/api/accounts/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: transferAmount,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Transfer Successful!',
          description: `${currencySymbol}${transferAmount.toLocaleString()} transferred from ${fromAccount?.name} to ${toAccount?.name}`,
        })
        setAmount('')
        setOpen(false)
        onTransferComplete?.()
      } else {
        const data = await response.json()
        toast({ title: data.error || 'Transfer failed', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Transfer error:', error)
      toast({ title: 'Transfer failed', variant: 'destructive' })
    } finally {
      setIsTransferring(false)
    }
  }

  const handleSwap = () => {
    const temp = fromAccountId
    setFromAccountId(toAccountId)
    setToAccountId(temp)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
            Transfer Between Accounts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* From Account */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">From</label>
            <div className="relative">
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.icon} {account.name} ({currencySymbol}{account.type === 'credit' && account.balance > 0 ? '-' : ''}{Math.abs(account.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <ArrowDownRight className="w-5 h-5 text-emerald-600 rotate-[-90deg]" />
            </button>
          </div>

          {/* To Account */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">To</label>
            <div className="relative">
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full h-11 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 pr-8 text-sm appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.icon} {account.name} ({currencySymbol}{account.type === 'credit' && account.balance > 0 ? '-' : ''}{Math.abs(account.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Amount</label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-bold h-11"
                min="0"
                step="0.01"
              />
            </div>
            {fromAccount && amount && parseFloat(amount) > 0 && fromAccount.type !== 'credit' && (
              <p className={`text-xs mt-1 ${fromAccount.balance < parseFloat(amount) ? 'text-red-500' : 'text-muted-foreground'}`}>
                Available: {currencySymbol}{fromAccount.balance.toLocaleString()}
              </p>
            )}
          </div>

          {/* Transfer Button */}
          <Button
            onClick={handleTransfer}
            disabled={isTransferring || !amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isTransferring ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <ArrowRightLeft className="w-4 h-4 mr-2" />
            )}
            Transfer {currencySymbol}{amount ? parseFloat(amount).toLocaleString() : '0'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This adjusts account balances. It&apos;s not recorded as an expense or income.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
