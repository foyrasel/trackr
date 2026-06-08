'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Wallet, CreditCard, Banknote, Smartphone, Plus, ArrowUpRight, ArrowDownRight, Edit3 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color: string
  icon: string
  isDefault: boolean
}

interface BalanceCardsProps {
  refreshTrigger: number
  onBalanceUpdate?: () => void
  userName?: string
}

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-5 h-5" />,
  debit: <Wallet className="w-5 h-5" />,
  credit: <CreditCard className="w-5 h-5" />,
  mobile: <Smartphone className="w-5 h-5" />,
}

export default function BalanceCards({ refreshTrigger, onBalanceUpdate, userName }: BalanceCardsProps) {
  const { currencySymbol } = useCurrency()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchAccounts = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      const response = await fetch('/api/accounts', { headers })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }, [userName])

  useEffect(() => {
    if (mounted) {
      setLoading(true)
      fetchAccounts()
    }
  }, [fetchAccounts, refreshTrigger, mounted])

  const handleAdjustBalance = async () => {
    if (!editAccount || !adjustAmount) return

    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      const response = await fetch('/api/accounts', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          accountId: editAccount.id,
          amount,
          operation: adjustType,
        }),
      })

      if (response.ok) {
        toast({
          title: adjustType === 'add' ? 'Balance Added' : 'Balance Deducted',
          description: `${currencySymbol}${amount.toLocaleString()} ${adjustType === 'add' ? 'added to' : 'deducted from'} ${editAccount.name}`,
        })
        setDialogOpen(false)
        setAdjustAmount('')
        fetchAccounts()
        onBalanceUpdate?.()
      }
    } catch (error) {
      console.error('Error adjusting balance:', error)
      toast({ title: 'Failed to update balance', variant: 'destructive' })
    }
  }

  if (!mounted || loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalBalance = accounts.reduce((sum, acc) => {
    if (acc.type === 'credit') return sum - acc.balance // Credit card balance is debt
    return sum + acc.balance
  }, 0)

  return (
    <div className="space-y-3">
      {/* Total Balance */}
      <Card className={`border-2 ${totalBalance >= 0 ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-red-200 bg-gradient-to-br from-red-50 to-white'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Balance</p>
              <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                {currencySymbol}{totalBalance.toLocaleString()}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Account Cards */}
      <div className="grid grid-cols-3 gap-2">
        {accounts.map(account => (
          <Dialog key={account.id} open={dialogOpen && editAccount?.id === account.id} onOpenChange={(open) => {
            setDialogOpen(open)
            if (open) setEditAccount(account)
            else setEditAccount(null)
          }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-all border hover:border-emerald-200 group">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: account.color }}>
                      <span className="text-sm">{account.icon}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">{account.name}</span>
                    <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                  <p className={`text-sm font-bold ${account.type === 'credit' && account.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {account.type === 'credit' && account.balance > 0 ? '-' : ''}{currencySymbol}{Math.abs(account.balance).toLocaleString()}
                  </p>
                  {account.type === 'credit' && account.balance > 0 && (
                    <p className="text-[9px] text-red-500 font-medium">Owed</p>
                  )}
                  {account.type === 'credit' && account.balance <= 0 && account.balance !== 0 && (
                    <p className="text-[9px] text-emerald-500 font-medium">Credit Available</p>
                  )}
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{account.icon}</span>
                  Adjust {account.name} Balance
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className={`text-3xl font-bold ${account.type === 'credit' && account.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {account.type === 'credit' && account.balance > 0 ? '-' : ''}{currencySymbol}{Math.abs(account.balance).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setAdjustType('add')}
                    variant={adjustType === 'add' ? 'default' : 'outline'}
                    className={`flex-1 ${adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Add Money
                  </Button>
                  <Button
                    onClick={() => setAdjustType('subtract')}
                    variant={adjustType === 'subtract' ? 'default' : 'outline'}
                    className={`flex-1 ${adjustType === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    Deduct
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-muted-foreground">{currencySymbol}</span>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <Button
                  onClick={handleAdjustBalance}
                  disabled={!adjustAmount || parseFloat(adjustAmount) <= 0}
                  className={`w-full ${adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {adjustType === 'add' ? 'Add' : 'Deduct'} {currencySymbol}{adjustAmount ? parseFloat(adjustAmount).toLocaleString() : '0'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  )
}
