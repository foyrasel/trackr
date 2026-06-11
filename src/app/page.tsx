'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AddTransaction from '@/components/tracker/AddTransaction'
import Dashboard from '@/components/tracker/Dashboard'
import TransactionList from '@/components/tracker/TransactionList'
import BudgetPanel from '@/components/tracker/BudgetPanel'
import LandingPage from '@/components/tracker/LandingPage'
import OnboardingScreen from '@/components/tracker/OnboardingScreen'
import AccountSetup from '@/components/tracker/AccountSetup'
import InsightsPanel from '@/components/tracker/InsightsPanel'
import MorePanel from '@/components/tracker/MorePanel'
import { CurrencyProvider, useCurrency } from '@/components/tracker/CurrencyContext'
import { useRecurringExecution } from '@/hooks/use-recurring-exec'
import ErrorBoundary from '@/components/ErrorBoundary'
import { LayoutDashboard, Plus, History, Lightbulb, Target, LogOut, Loader2, MoreHorizontal, Moon, Sun } from 'lucide-react'

function CurrencyDisplay() {
  const { currency } = useCurrency()
  return <>{currency}</>
}

/**
 * Helper: Build auth headers from localStorage for API calls
 * This ensures all API calls include x-user-id and x-user-email for reliable user lookup
 */
function buildAuthHeaders(userName?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (userName) headers['x-user-name'] = userName
  if (typeof window !== 'undefined') {
    const userEmail = localStorage.getItem('trackr_user_email')
    const userId = localStorage.getItem('trackr_user_id')
    if (userEmail) headers['x-user-email'] = userEmail
    if (userId) headers['x-user-id'] = userId
  }
  return headers
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAccountSetup, setShowAccountSetup] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false)

  const { data: session, status } = useSession()

  // Mark as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user settings (dark mode, language, currency) after login
  useEffect(() => {
    if (isLoggedIn) {
      const headers = buildAuthHeaders(userName)
      fetch('/api/user', { headers })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            if (data.darkMode !== undefined) {
              setIsDarkMode(data.darkMode)
              if (data.darkMode) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            }
            // Store user id and email from server response
            if (data.id) {
              setUserId(data.id)
              localStorage.setItem('trackr_user_id', data.id)
            }
            if (data.email) {
              setUserEmail(data.email)
              localStorage.setItem('trackr_user_email', data.email)
            }
          }
        })
        .catch(console.error)
    }
  }, [isLoggedIn, userName])

  /**
   * Check if user has completed onboarding by checking if they have accounts.
   * Uses multiple lookup methods: x-user-id, x-user-email, x-user-name
   * If user has accounts, immediately sets localStorage flags to prevent
   * onboarding from showing again on subsequent logins.
   */
  const checkOnboardingStatus = useCallback(async (name: string, email?: string | null, id?: string | null) => {
    if (email) localStorage.setItem('trackr_user_email', email)
    if (id) localStorage.setItem('trackr_user_id', id)

    const headers: Record<string, string> = {}
    if (name) headers['x-user-name'] = name
    if (email) headers['x-user-email'] = email
    if (id) headers['x-user-id'] = id
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('trackr_user_email')
      const savedId = localStorage.getItem('trackr_user_id')
      if (savedEmail && !headers['x-user-email']) headers['x-user-email'] = savedEmail
      if (savedId && !headers['x-user-id']) headers['x-user-id'] = savedId
    }

    const markDone = (userId?: string) => {
      localStorage.setItem('trackr_onboarding_done', 'true')
      localStorage.setItem('trackr_account_setup_done', 'true')
      if (userId) {
        setUserId(userId)
        localStorage.setItem('trackr_user_id', userId)
      }
    }

    const checkOnce = async (): Promise<boolean> => {
      const [onboardingRes, accountsRes] = await Promise.all([
        fetch('/api/auth/check-onboarding', { headers }).catch(() => null),
        fetch('/api/accounts', { headers }).catch(() => null),
      ])

      const onboardingData = onboardingRes?.ok ? await onboardingRes.json().catch(() => null) : null
      if (onboardingData?.onboardingDone) {
        markDone(onboardingData.userId)
        return true
      }

      const accountsData = accountsRes?.ok ? await accountsRes.json().catch(() => null) : null
      if (accountsData?.accounts && accountsData.accounts.length > 0) {
        markDone(accountsData.userId)
        return true
      }

      return false
    }

    try {
      if (await checkOnce()) return

      // One retry after a short delay — needed for OAuth session propagation
      await new Promise(resolve => setTimeout(resolve, 1500))
      if (await checkOnce()) return

      setShowOnboarding(true)
    } catch (error) {
      console.error('Error checking onboarding:', error)
      setShowOnboarding(true)
    }
  }, [])

  // Handle next-auth session (Google/Facebook/Apple OAuth redirect)
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const name = session.user.name || 'User'
      const email = session.user.email || null
      const id = (session.user as any).id || null

      // Persist to localStorage FIRST so subsequent API calls can use them
      localStorage.setItem('trackr_user_name', name)
      if (email) localStorage.setItem('trackr_user_email', email)
      if (id) localStorage.setItem('trackr_user_id', id)

      // Then update state
      setUserName(name)
      setUserEmail(email)
      setUserImage(session.user.image || null)
      if (id) setUserId(id)
      setIsLoggedIn(true)

      // Check onboarding status (now localStorage has id/email for reliable API calls)
      checkOnboardingStatus(name, email, id)
    }
  }, [session, status, checkOnboardingStatus])

  // Check for existing session on mount (localStorage fallback for demo/email users)
  useEffect(() => {
    if (status !== 'authenticated' && status !== 'loading') {
      const savedName = localStorage.getItem('trackr_user_name')
      if (savedName) {
        const savedEmail = localStorage.getItem('trackr_user_email')
        const savedId = localStorage.getItem('trackr_user_id')

        setUserName(savedName)
        if (savedEmail) setUserEmail(savedEmail)
        setIsLoggedIn(true)

        // Check onboarding
        checkOnboardingStatus(savedName, savedEmail, savedId)
      }
    }
  }, [status, checkOnboardingStatus])

  // Fetch userId after login if not yet available
  useEffect(() => {
    if (isLoggedIn && !userId) {
      const headers = buildAuthHeaders(userName)
      fetch('/api/accounts', { headers })
        .then(res => res.json())
        .then(data => {
          if (data.userId) {
            setUserId(data.userId)
            localStorage.setItem('trackr_user_id', data.userId)
          }
        })
        .catch(console.error)
    }
  }, [isLoggedIn, userId, userName])

  const handleLogin = (name: string, email?: string | null, id?: string | null) => {
    setUserName(name)
    setIsLoggedIn(true)
    localStorage.setItem('trackr_user_name', name)
    if (email) {
      setUserEmail(email)
      localStorage.setItem('trackr_user_email', email)
    }
    if (id) {
      setUserId(id)
      localStorage.setItem('trackr_user_id', id)
    }

    // Check onboarding status
    checkOnboardingStatus(name, email, id)
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('trackr_onboarding_done', 'true')
    setShowOnboarding(false)
    // Mark onboardingDone in the database so it persists across sessions/devices
    const headers = buildAuthHeaders(userName)
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ onboardingDone: true }),
    }).then(res => {
      if (!res.ok) console.error('Failed to mark onboarding done in DB')
    }).catch(err => console.error('Failed to mark onboarding done:', err))
    // Check if account setup has been done
    const accountSetupDone = localStorage.getItem('trackr_account_setup_done')
    if (!accountSetupDone) {
      setShowAccountSetup(true)
    }
  }

  const handleAccountSetupComplete = async (accounts: { name: string; type: string; balance: number; color: string; icon: string }[]) => {
    localStorage.setItem('trackr_account_setup_done', 'true')
    setShowAccountSetup(false)

    // Mark onboardingDone in the database so it persists across sessions/devices
    const headers = buildAuthHeaders(userName)
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ onboardingDone: true }),
    }).then(res => {
      if (!res.ok) console.error('Failed to mark onboarding done in DB')
    }).catch(err => console.error('Failed to mark onboarding done:', err))

    // Save the accounts to the database, updating existing ones instead of creating duplicates
    try {
      const existingRes = await fetch('/api/accounts', { headers })
      const existingData = existingRes.ok ? await existingRes.json() : null
      const existingAccounts = existingData?.accounts || []

      if (existingAccounts.length > 0) {
        // Only create accounts that don't exist yet (match by name, not type)
        for (const account of accounts) {
          const existingByName = existingAccounts.find((a: { name: string; id: string }) => a.name === account.name)
          if (!existingByName) {
            await fetch('/api/accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...headers },
              body: JSON.stringify(account),
            })
          }
        }
      } else {
        // No existing accounts — create all from setup
        for (const account of accounts) {
          await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(account),
          })
        }
      }

      setRefreshTrigger(prev => prev + 1)
    } catch (error) {
      console.error('Error saving accounts:', error)
    }
  }

  const handleAccountSetupSkip = () => {
    localStorage.setItem('trackr_account_setup_done', 'true')
    setShowAccountSetup(false)
    // Mark onboardingDone in the database so it persists across sessions/devices
    const headers = buildAuthHeaders(userName)
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ onboardingDone: true }),
    }).then(res => {
      if (!res.ok) console.error('Failed to mark onboarding done in DB')
    }).catch(err => console.error('Failed to mark onboarding done:', err))
  }

  const handleLogout = async () => {
    // Clear user identity from localStorage but KEEP onboarding flags
    // so returning users don't see setup screens again
    localStorage.removeItem('trackr_user_name')
    localStorage.removeItem('trackr_user_email')
    localStorage.removeItem('trackr_user_id')
    // DO NOT clear these — they prevent onboarding from showing again for returning users
    // localStorage.removeItem('trackr_onboarding_done')
    // localStorage.removeItem('trackr_account_setup_done')
    setUserName('')
    setUserEmail(null)
    setUserImage(null)
    setUserId(null)
    setIsLoggedIn(false)
    try {
      await signOut({ redirect: false })
    } catch {
      // Ignore signOut errors if no next-auth session
    }
  }

  const handleRefreshData = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  // Auto-execute due recurring transactions once per session
  useRecurringExecution(isLoggedIn ? userName : undefined, handleRefreshData)

  const handleTransactionAdded = () => {
    setActiveTab('dashboard')
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 300)
  }

  const handleToggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Persist to server
    const headers = buildAuthHeaders(userName)
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ darkMode: newMode }),
    }).catch(console.error)
    localStorage.setItem('trackr_dark_mode', newMode ? 'true' : 'false')
  }, [isDarkMode, userName])

  // Load dark mode from localStorage quickly (before server response)
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('trackr_dark_mode')
    if (savedDarkMode === 'true') {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Show loading while session is being checked (important for OAuth redirect)
  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-950 dark:to-emerald-950/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <span className="text-white text-3xl font-bold">T</span>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  // Show landing page if not logged in
  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />
  }

  // Show onboarding screen for first-time users
  if (showOnboarding) {
    return (
      <CurrencyProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </CurrencyProvider>
    )
  }

  // Show account setup wizard after onboarding
  if (showAccountSetup) {
    return <AccountSetup onComplete={handleAccountSetupComplete} onSkip={handleAccountSetupSkip} userName={userName} />
  }

  // Get user initials for avatar fallback
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <CurrencyProvider>
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800">
        <div className="w-full mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold leading-tight">Trackr</h1>
              <p className="text-sm text-muted-foreground leading-tight">
                {userName ? `Hi, ${userName}` : 'AI Voice Expense Tracker'}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              <CurrencyDisplay />
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDarkMode}
              className="text-muted-foreground hover:text-emerald-600 h-8 w-8 p-0"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {userImage && (
              <Avatar className="h-7 w-7">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">{userInitials}</AvatarFallback>
              </Avatar>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Single Tabs component wrapping both content and navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Main Content */}
        <main className="w-full mx-auto px-2 sm:px-4 pb-24 pt-2 sm:pt-4 flex-1">
          <TabsContent value="dashboard" className="mt-0">
            <ErrorBoundary label="Dashboard">
              <Dashboard refreshTrigger={refreshTrigger} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="add" className="mt-0">
            <ErrorBoundary label="Add Transaction">
              <AddTransaction onTransactionAdded={handleTransactionAdded} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="budget" className="mt-0">
            <ErrorBoundary label="Budget">
              <BudgetPanel refreshTrigger={refreshTrigger} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <ErrorBoundary label="History">
              <TransactionList refreshTrigger={refreshTrigger} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <ErrorBoundary label="Insights">
              <InsightsPanel refreshTrigger={refreshTrigger} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="more" className="mt-0">
            <ErrorBoundary label="Settings">
              <MorePanel
                userName={userName}
                refreshTrigger={refreshTrigger}
                onToggleDarkMode={handleToggleDarkMode}
                isDarkMode={isDarkMode}
              />
            </ErrorBoundary>
          </TabsContent>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t dark:border-gray-800 z-50">
          <div className="w-full mx-auto">
            <TabsList className="w-full h-16 bg-transparent justify-around p-0 shadow-none">
              <TabsTrigger
                value="dashboard"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-sm">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="budget"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <Target className="w-5 h-5" />
                <span className="text-sm">Budget</span>
              </TabsTrigger>

              <TabsTrigger
                value="add"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1 relative"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center -mt-5 shadow-lg shadow-emerald-500/30">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm">Add</span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <History className="w-5 h-5" />
                <span className="text-sm">History</span>
              </TabsTrigger>

              <TabsTrigger
                value="more"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-sm">More</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </nav>
      </Tabs>
    </div>
    </CurrencyProvider>
  )
}
