'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Moon,
  Sun,
  Download,
  FileText,
  Target,
  HandCoins,
  Bell,
  Repeat,
  CreditCard,
  Settings,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Check,
  Smartphone,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'
import { useSession } from 'next-auth/react'
import PasswordVerifyDialog from './PasswordVerifyDialog'

import GoalsPanel from './GoalsPanel'
import LendBorrowPanel from './LendBorrowPanel'
import RemindersPanel from './RemindersPanel'
import RecurringPanel from './RecurringPanel'
import { useNotificationCheck, useNotificationPermission } from '@/hooks/use-notifications'
import { isNotificationSupported, getNotificationPermission } from '@/lib/notifications'

interface MorePanelProps {
  userName?: string
  refreshTrigger?: number
  onToggleDarkMode?: () => void
  isDarkMode?: boolean
}

type PanelView = 'menu' | 'goals' | 'lendBorrow' | 'reminders' | 'recurring' | 'export' | 'accounts' | 'settings'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
]

const ACCOUNT_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
]

const ACCOUNT_ICONS = ['💵', '💳', '🏦', '📱', '💰', '👛', '🏧', '🏢']

interface AccountItem {
  id: string
  name: string
  type: string
  balance: number
  color: string
  icon: string
  isDefault: boolean
}

// ─── Export Sub-Panel ────────────────────────────────────────────────────────

function ExportPanel({ userName, onBack }: { userName?: string; onBack: () => void }) {
  const [month, setMonth] = useState('')
  const [type, setType] = useState('all')
  const [exporting, setExporting] = useState(false)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (userName) headers['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
    }
    return headers
  }, [userName])

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('format', format)
      if (month) params.set('month', month)
      if (type !== 'all') params.set('type', type)

      const response = await fetch(`/api/export?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disposition = response.headers.get('Content-Disposition')
        const filename = disposition
          ? disposition.split('filename=')[1]?.replace(/"/g, '')
          : `transactions.${format === 'csv' ? 'csv' : 'txt'}`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({ title: `Exported as ${format.toUpperCase()}` })
      } else {
        toast({ title: 'Export failed', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast({ title: 'Export failed', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Download className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-bold">Export Data</h2>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Month selector */}
          <div>
            <Label className="text-xs text-muted-foreground">Month (optional)</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Type filter */}
          <div>
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-1" />
              )}
              Export as CSV
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1" />
              )}
              Export as PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Accounts Sub-Panel ──────────────────────────────────────────────────────

function AccountsPanel({ userName, onBack }: { userName?: string; onBack: () => void }) {
  const { currencySymbol } = useCurrency()
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Add form
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('cash')
  const [formBalance, setFormBalance] = useState('')
  const [formColor, setFormColor] = useState('#10b981')
  const [formIcon, setFormIcon] = useState('💵')

  // Edit form
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editColor, setEditColor] = useState('')

  // Password verification state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pendingEditAccount, setPendingEditAccount] = useState<AccountItem | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)

  // Check if current user needs password verification
  useEffect(() => {
    if (session?.user) {
      const h: Record<string, string> = {}
      if (userName) h['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) h['x-user-email'] = userEmail
        if (userId) h['x-user-id'] = userId
      }
      fetch('/api/user', { headers: h })
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
      setNeedsPassword(false)
    }
  }, [session, userName])

  const getAuthHeaders = useCallback((contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (userName) headers['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
    }
    return headers
  }, [userName])

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts', {
        headers: getAuthHeaders(false),
      })
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleAddAccount = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: formType,
          name: formName.trim(),
          balance: parseFloat(formBalance) || 0,
          color: formColor,
          icon: formIcon,
        }),
      })
      if (response.ok) {
        toast({ title: 'Account added' })
        setShowAddDialog(false)
        resetAddForm()
        fetchAccounts()
      } else {
        toast({ title: 'Failed to add account', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error adding account:', error)
      toast({ title: 'Failed to add account', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditAccount = async () => {
    if (!selectedAccount || !editName.trim()) return
    setSaving(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: selectedAccount.id,
          name: editName.trim(),
          icon: editIcon,
          color: editColor,
        }),
      })
      if (response.ok) {
        toast({ title: 'Account updated' })
        setShowEditDialog(false)
        setSelectedAccount(null)
        fetchAccounts()
      } else {
        toast({ title: 'Failed to update account', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error updating account:', error)
      toast({ title: 'Failed to update account', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteId) return
    try {
      const response = await fetch(`/api/accounts?id=${deleteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      if (response.ok) {
        toast({ title: 'Account deleted' })
        fetchAccounts()
      } else {
        const data = await response.json()
        toast({ title: data.error || 'Failed to delete account', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({ title: 'Failed to delete account', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  const resetAddForm = () => {
    setFormName('')
    setFormType('cash')
    setFormBalance('')
    setFormColor('#10b981')
    setFormIcon('💵')
  }

  const openEditDialog = (account: AccountItem) => {
    if (needsPassword) {
      // Show password dialog first
      setPendingEditAccount(account)
      setShowPasswordDialog(true)
    } else {
      // No password needed, open edit dialog directly
      doOpenEditDialog(account)
    }
  }

  const doOpenEditDialog = (account: AccountItem) => {
    setSelectedAccount(account)
    setEditName(account.name)
    setEditIcon(account.icon)
    setEditColor(account.color)
    setShowEditDialog(true)
  }

  const handlePasswordVerified = () => {
    if (pendingEditAccount) {
      doOpenEditDialog(pendingEditAccount)
      setPendingEditAccount(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash': return '💵'
      case 'debit': return '💳'
      case 'credit': return '💳'
      case 'mobile': return '📱'
      default: return '💰'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Manage Accounts</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Manage Accounts</h2>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            resetAddForm()
            setShowAddDialog(true)
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Account
        </Button>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm">No accounts found. Add your first account!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${account.color}20`, color: account.color }}
                  >
                    {account.icon || getTypeIcon(account.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{account.type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${account.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {account.balance >= 0 ? '' : '-'}{currencySymbol}{Math.abs(account.balance).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-600"
                      onClick={() => openEditDialog(account)}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    {!account.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(account.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1"
                placeholder="e.g., My Wallet"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="debit">💳 Debit Card</SelectItem>
                  <SelectItem value="credit">💳 Credit Card</SelectItem>
                  <SelectItem value="mobile">📱 Mobile Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Initial Balance</Label>
              <Input
                type="number"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 rounded-md flex items-center justify-center border-2 transition-all ${
                      formColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  >
                    {formColor === color && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {ACCOUNT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`h-9 rounded-md text-lg flex items-center justify-center border transition-all ${
                      formIcon === icon
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-input hover:bg-muted'
                    }`}
                    onClick={() => setFormIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleAddAccount}
                disabled={!formName.trim() || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {ACCOUNT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 rounded-md flex items-center justify-center border-2 transition-all ${
                      editColor === color
                        ? 'border-foreground scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEditColor(color)}
                  >
                    {editColor === color && (
                      <span className="text-white text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {ACCOUNT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`h-9 rounded-md text-lg flex items-center justify-center border transition-all ${
                      editIcon === icon
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-input hover:bg-muted'
                    }`}
                    onClick={() => setEditIcon(icon)}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditDialog(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleEditAccount}
                disabled={!editName.trim() || saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Verification Dialog */}
      <PasswordVerifyDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onVerified={handlePasswordVerified}
        userName={userName}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this account? Any remaining balance will be transferred to your cash account.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteAccount}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Settings Sub-Panel ──────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'bn', label: 'বাংলা (Bangla)', flag: '🇧🇩' },
  { code: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
]

function SettingsPanel({
  userName,
  onBack,
}: {
  userName?: string
  onBack: () => void
}) {
  const { currency, currencySymbol, language, setCurrency, setLanguage } = useCurrency()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const { requestPermission } = useNotificationPermission()
  const [geminiKey, setGeminiKey] = useState('')
  const [hasGeminiKey, setHasGeminiKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Check for PWA install prompt on mount (only runs client-side)
  useEffect(() => {
    const storedPrompt = (window as unknown as Record<string, unknown>).beforeInstallPromptEvent
    if (storedPrompt) {
      // Using a microtask to avoid synchronous setState in effect
      queueMicrotask(() => setInstallPrompt(storedPrompt as BeforeInstallPromptEvent))
    }
  }, [])

  // Read notification permission on mount
  useEffect(() => {
    setNotifPermission(getNotificationPermission())
  }, [])

  // Load whether user has a Gemini key saved
  useEffect(() => {
    const load = async () => {
      try {
        const headers: Record<string, string> = {}
        if (userName) headers['x-user-name'] = userName
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
        const res = await fetch('/api/user', { headers })
        if (res.ok) {
          const data = await res.json()
          setHasGeminiKey(!!data.hasGeminiKey)
        }
      } catch {}
    }
    load()
  }, [userName])

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    setNotifPermission(granted ? 'granted' : getNotificationPermission())
    if (granted) {
      toast({ title: 'Notifications enabled!' })
    } else {
      toast({ title: 'Notification permission denied', variant: 'destructive' })
    }
  }

  const handleCurrencyChange = async (code: string) => {
    const curr = CURRENCIES.find((c) => c.code === code)
    if (!curr) return
    setCurrency(curr.code, curr.symbol)

    // Also persist to backend
    try {
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
      await fetch('/api/user', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ currency: curr.code, currencySymbol: curr.symbol }),
      })
      toast({ title: `Currency changed to ${curr.code} (${curr.symbol})` })
    } catch {
      toast({ title: 'Failed to save currency preference', variant: 'destructive' })
    }
  }

  const handleInstall = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      toast({ title: 'App installed!' })
    }
    setInstallPrompt(null)
  }

  const handleSaveGeminiKey = async () => {
    setGeminiKeyStatus('saving')
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      const userEmail = localStorage.getItem('trackr_user_email')
      const userId = localStorage.getItem('trackr_user_id')
      if (userEmail) headers['x-user-email'] = userEmail
      if (userId) headers['x-user-id'] = userId
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ geminiApiKey: geminiKey.trim() || null }),
      })
      if (res.ok) {
        setGeminiKeyStatus('saved')
        setHasGeminiKey(!!geminiKey.trim())
        setGeminiKey('')
        toast({ title: geminiKey.trim() ? 'Gemini key saved — AI is now active!' : 'Gemini key removed' })
        setTimeout(() => setGeminiKeyStatus('idle'), 3000)
      } else {
        setGeminiKeyStatus('error')
        toast({ title: 'Failed to save key', variant: 'destructive' })
      }
    } catch {
      setGeminiKeyStatus('error')
      toast({ title: 'Failed to save key', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Settings className="w-5 h-5 text-emerald-500" />
        <h2 className="text-lg font-bold">Settings</h2>
      </div>

      {/* Language */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs text-muted-foreground">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Currency */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs text-muted-foreground">Currency</Label>
          <Select value={currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs text-muted-foreground">Notifications</Label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                {notifPermission === 'unsupported'
                  ? 'Not supported in this browser'
                  : notifPermission === 'granted'
                    ? 'Notifications enabled'
                    : notifPermission === 'denied'
                      ? 'Notifications blocked'
                      : 'Notifications not enabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {notifPermission === 'granted'
                  ? 'You\'ll receive bill reminders & weekly summaries'
                  : notifPermission === 'denied'
                    ? 'Enable in your browser settings to get reminders'
                    : notifPermission === 'unsupported'
                      ? 'Try using a Chromium-based browser'
                      : 'Enable to get bill reminders & weekly summaries'}
              </p>
            </div>
            {notifPermission === 'default' && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleEnableNotifications}
              >
                <Bell className="w-4 h-4 mr-1" />
                Enable
              </Button>
            )}
            {notifPermission === 'granted' && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">Active</Badge>
            )}
            {notifPermission === 'denied' && (
              <Badge variant="destructive" className="text-xs">Blocked</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Install App */}
      {installPrompt && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Install Trackr</p>
                <p className="text-xs text-muted-foreground">Add to your home screen for quick access</p>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleInstall}
              >
                <Smartphone className="w-4 h-4 mr-1" />
                Install
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI — Gemini API Key */}
      <Card className="border-violet-200 dark:border-violet-900">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <Label className="text-xs text-muted-foreground">AI Assistant</Label>
            {hasGeminiKey && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs ml-auto">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium">Gemini API Key</p>
          <p className="text-xs text-muted-foreground">
            {hasGeminiKey
              ? 'Your key is saved. Enter a new one to replace it, or clear to remove.'
              : 'Add your free Gemini key for smarter AI categorization of your expenses.'}
          </p>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type={showGeminiKey ? 'text' : 'password'}
                placeholder={hasGeminiKey ? '••••••••••••••••' : 'AIzaSy...'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleSaveGeminiKey}
              disabled={geminiKeyStatus === 'saving' || (!geminiKey.trim() && !hasGeminiKey)}
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {geminiKeyStatus === 'saving' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : geminiKeyStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : hasGeminiKey && !geminiKey.trim() ? (
                'Clear'
              ) : (
                'Save'
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your free key at{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 dark:text-violet-400 underline underline-offset-2"
            >
              aistudio.google.com
            </a>
            {' '}— free 1,500 requests/day
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Trackr v1.0 — Voice-first AI expense tracker. Made for everyone.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main MorePanel Component ────────────────────────────────────────────────

export default function MorePanel({
  userName,
  refreshTrigger,
  onToggleDarkMode,
  isDarkMode,
}: MorePanelProps) {
  const { currencySymbol } = useCurrency()
  const [activePanel, setActivePanel] = useState<PanelView>('menu')

  // Notification permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const { requestPermission } = useNotificationPermission()

  // Check for overdue/upcoming reminders on mount and show notifications
  useNotificationCheck(userName)

  // Read notification permission on mount
  useEffect(() => {
    setNotifPermission(getNotificationPermission())
  }, [])

  const handleEnableNotifications = async () => {
    const granted = await requestPermission()
    setNotifPermission(granted ? 'granted' : getNotificationPermission())
    if (granted) {
      toast({ title: 'Notifications enabled!' })
    } else {
      toast({ title: 'Notification permission denied', variant: 'destructive' })
    }
  }

  // Weekly summary state
  const [summary, setSummary] = useState<{
    totalIncome: number
    totalExpense: number
    savingsRate: number
    transactionCount: number
  } | null>(null)

  useEffect(() => {
    if (userName) {
      const headers: Record<string, string> = {}
      if (userName) headers['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
      fetch('/api/notifications?period=weekly', { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.summary) {
            setSummary(data.summary)
          }
        })
        .catch(() => {})
    }
  }, [userName, refreshTrigger])

  const menuItems = [
    {
      id: 'goals' as PanelView,
      icon: '🎯',
      title: 'Goals',
      description: 'Track savings targets',
    },
    {
      id: 'lendBorrow' as PanelView,
      icon: '🤝',
      title: 'Lend/Borrow',
      description: 'Money lent & borrowed',
    },
    {
      id: 'reminders' as PanelView,
      icon: '🔔',
      title: 'Bill Reminders',
      description: 'Never miss a bill',
    },
    {
      id: 'recurring' as PanelView,
      icon: '🔄',
      title: 'Recurring',
      description: 'Auto-add transactions',
    },
    {
      id: 'export' as PanelView,
      icon: '📤',
      title: 'Export Data',
      description: 'Download CSV or PDF',
    },
    {
      id: 'accounts' as PanelView,
      icon: '💳',
      title: 'Accounts',
      description: 'Manage payment accounts',
    },
    {
      id: 'darkMode' as PanelView,
      icon: isDarkMode ? '☀️' : '🌙',
      title: 'Dark Mode',
      description: isDarkMode ? 'On' : 'Off',
      isToggle: true,
    },
    {
      id: 'settings' as PanelView,
      icon: '⚙️',
      title: 'Settings',
      description: 'Currency & preferences',
    },
  ]

  // Show notification enable prompt if notifications are supported but not yet granted
  const showNotifPrompt = isNotificationSupported() && notifPermission === 'default'

  const handleCardClick = (item: typeof menuItems[number]) => {
    if (item.isToggle) {
      onToggleDarkMode?.()
      return
    }
    setActivePanel(item.id)
  }

  const handleBack = () => {
    setActivePanel('menu')
  }

  // Detail views
  if (activePanel === 'goals') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Target className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Goals</h2>
        </div>
        <GoalsPanel userName={userName} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  if (activePanel === 'lendBorrow') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <HandCoins className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Lend/Borrow</h2>
        </div>
        <LendBorrowPanel userName={userName} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  if (activePanel === 'reminders') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Bell className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Bill Reminders</h2>
        </div>
        <RemindersPanel userName={userName} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  if (activePanel === 'recurring') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Repeat className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Recurring</h2>
        </div>
        <RecurringPanel userName={userName} refreshTrigger={refreshTrigger} />
      </div>
    )
  }

  if (activePanel === 'export') {
    return <ExportPanel userName={userName} onBack={handleBack} />
  }

  if (activePanel === 'accounts') {
    return <AccountsPanel userName={userName} onBack={handleBack} />
  }

  if (activePanel === 'settings') {
    return (
      <SettingsPanel
        userName={userName}
        onBack={handleBack}
      />
    )
  }

  // Menu mode (default)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">More</h2>
        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
          {menuItems.length} features
        </Badge>
      </div>

      {/* Weekly Summary Card */}
      {summary && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-700 mb-2">This Week&apos;s Summary</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-sm font-bold text-emerald-600">{currencySymbol}{summary.totalIncome.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expense</p>
                <p className="text-sm font-bold text-red-600">{currencySymbol}{summary.totalExpense.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings</p>
                <p className={`text-sm font-bold ${summary.savingsRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{summary.savingsRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enable Notifications Card */}
      {showNotifPrompt && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Enable Notifications</p>
                  <p className="text-xs text-muted-foreground">Get bill reminders & weekly summaries</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleEnableNotifications}
              >
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <Card
            key={item.id}
            className={`cursor-pointer hover:shadow-md transition-all hover:border-emerald-200 ${
              item.isToggle && isDarkMode ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' : ''
            }`}
            onClick={() => handleCardClick(item)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-2xl" role="img" aria-label={item.title}>
                  {item.icon}
                </span>
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
