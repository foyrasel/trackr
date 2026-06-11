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
} from '@/components/ui/dialog'
import { Wallet, CreditCard, Banknote, Smartphone, Plus, ArrowUpRight, ArrowDownRight, Edit3 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'
import TransferDialog from './TransferDialog'
import PasswordVerifyDialog from './PasswordVerifyDialog'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Password verification state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null)

  // Check if user has a password (email provider)
  const userHasPassword = session?.user ? true : false
  // We'll check via API if the user has a password set
  const [needsPassword, setNeedsPassword] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if current user needs password verification
  useEffect(() => {
    if (mounted) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (userName) headers['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
      fetch('/api/auth/verify-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          // If the API returns verified:true without a password, user doesn't need one
          // If it returns 400 (password required), user needs password verification
          setNeedsPassword(false)
        })
        .catch(() => {})

      // Better approach: check user provider from session or API
      // Use the session provider to determine
      if (session?.user) {
        // Authenticated via next-auth - could be email or OAuth
        // Check via API
        fetch('/api/user', {
          headers: (() => {
            const h: Record<string, string> = {}
            if (userName) h['x-user-name'] = userName
            if (typeof window !== 'undefined') {
              const userEmail = localStorage.getItem('trackr_user_email')
              const userId = localStorage.getItem('trackr_user_id')
              if (userEmail) h['x-user-email'] = userEmail
              if (userId) h['x-user-id'] = userId
            }
            return h
          })(),
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.provider === 'email') {
              setNeedsPassword(true)
            } else {
              setNeedsPassword(false)
            }
          })
          .catch(() => {})
      } else {
        // Demo mode user - no password needed
        setNeedsPassword(false)
      }
    }
  }, [mounted, session, userName])

  const fetchAccounts = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      // Also include email and id from localStorage for reliable user lookup
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
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

  const handleAccountClick = (account: Account) => {
    if (needsPassword) {
      // Show password dialog first
      setPendingAccount(account)
      setShowPasswordDialog(true)
    } else {
      // No password needed, open adjust dialog directly
      setEditAccount(account)
      setDialogOpen(true)
    }
  }

  const handlePasswordVerified = () => {
    // Password verified, now show the adjust balance dialog
    if (pendingAccount) {
      setEditAccount(pendingAccount)
      setDialogOpen(true)
      setPendingAccount(null)
    }
  }

  const handleAdjustBalance = async () => {
    if (!editAccount || !adjustAmount) return

    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      // Also include email and id from localStorage for reliable user lookup
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
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

      {/* Transfer Button */}
      {accounts.length >= 2 && (
        <div className="flex justify-center">
          <TransferDialog accounts={accounts} userName={userName} onTransferComplete={fetchAccounts} />
        </div>
      )}

      {/* Individual Account Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {accounts.map(account => (
          <Card
            key={account.id}
            className="cursor-pointer hover:shadow-md transition-all border hover:border-emerald-200 group"
            onClick={() => handleAccountClick(account)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: account.color }}>
                  <span className="text-sm">{account.icon}</span>
                </div>
                <span className="text-xs text-muted-foreground font-medium truncate">{account.name}</span>
                <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </div>
              <p className={`text-sm font-bold ${account.type === 'credit' && account.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {account.type === 'credit' && account.balance > 0 ? '-' : ''}{currencySymbol}{Math.abs(account.balance).toLocaleString()}
              </p>
              {account.type === 'credit' && account.balance > 0 && (
                <p className="text-xs text-red-500 font-medium">Owed</p>
              )}
              {account.type === 'credit' && account.balance <= 0 && account.balance !== 0 && (
                <p className="text-xs text-emerald-500 font-medium">Credit Available</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Password Verification Dialog */}
      <PasswordVerifyDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onVerified={handlePasswordVerified}
        userName={userName}
      />

      {/* Adjust Balance Dialog */}
      {editAccount && (
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditAccount(null)
            setAdjustAmount('')
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>{editAccount.icon}</span>
                Adjust {editAccount.name} Balance
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className={`text-3xl font-bold ${editAccount.type === 'credit' && editAccount.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {editAccount.type === 'credit' && editAccount.balance > 0 ? '-' : ''}{currencySymbol}{Math.abs(editAccount.balance).toLocaleString()}
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
      )}
    </div>
  )
}
