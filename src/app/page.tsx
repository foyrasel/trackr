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
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-800/60">
        <div className="w-full max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <span className="text-white text-base font-extrabold tracking-tight">T</span>
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight tracking-tight">Trackr</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {userName ? `Hi, ${userName.split(' ')[0]}` : 'AI Expense Tracker'}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleDarkMode}
              className="text-muted-foreground hover:text-emerald-600 h-9 w-9 p-0 rounded-xl"
            >
              {isDarkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer" onClick={() => setActiveTab('more')}>
              {userImage && <AvatarImage src={userImage} alt={userName} />}
              <AvatarFallback className="text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">{userInitials || '?'}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-500 h-9 w-9 p-0 rounded-xl">
              <LogOut className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      {/* Single Tabs component wrapping both content and navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Main Content */}
        <main className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-28 pt-4 flex-1">
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
        <nav className="fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-white/97 dark:bg-gray-950/97 backdrop-blur-xl border-t border-gray-100/80 dark:border-gray-800/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
            <div className="w-full max-w-2xl mx-auto">
              <TabsList className="w-full h-[62px] bg-transparent justify-around p-0 shadow-none rounded-none">
                <TabsTrigger
                  value="dashboard"
                  className="group flex-col gap-0.5 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-gray-400 dark:text-gray-500 px-1 pb-2 pt-2.5 flex-1 h-full rounded-none relative"
                >
                  <LayoutDashboard className="w-[22px] h-[22px]" />
                  <span className="text-[10px] font-medium leading-none">Home</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 opacity-0 group-data-[state=active]:opacity-100 transition-opacity" />
                </TabsTrigger>

                <TabsTrigger
                  value="budget"
                  className="group flex-col gap-0.5 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-gray-400 dark:text-gray-500 px-1 pb-2 pt-2.5 flex-1 h-full rounded-none relative"
                >
                  <Target className="w-[22px] h-[22px]" />
                  <span className="text-[10px] font-medium leading-none">Budget</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 opacity-0 group-data-[state=active]:opacity-100 transition-opacity" />
                </TabsTrigger>

                <TabsTrigger
                  value="add"
                  className="flex-col items-center justify-end data-[state=active]:shadow-none data-[state=active]:bg-transparent px-1 pb-2 pt-0 flex-1 h-full rounded-none relative gap-0.5"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center -mt-5 shadow-lg shadow-emerald-500/35 active:scale-95 transition-transform">
                    <Plus className="w-[26px] h-[26px] text-white stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-medium leading-none text-gray-400 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400">Add</span>
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className="group flex-col gap-0.5 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-gray-400 dark:text-gray-500 px-1 pb-2 pt-2.5 flex-1 h-full rounded-none relative"
                >
                  <History className="w-[22px] h-[22px]" />
                  <span className="text-[10px] font-medium leading-none">History</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 opacity-0 group-data-[state=active]:opacity-100 transition-opacity" />
                </TabsTrigger>

                <TabsTrigger
                  value="more"
                  className="group flex-col gap-0.5 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-none data-[state=active]:bg-transparent text-gray-400 dark:text-gray-500 px-1 pb-2 pt-2.5 flex-1 h-full rounded-none relative"
                >
                  <MoreHorizontal className="w-[22px] h-[22px]" />
                  <span className="text-[10px] font-medium leading-none">More</span>
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500 opacity-0 group-data-[state=active]:opacity-100 transition-opacity" />
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </nav>
      </Tabs>
    </div>
    </CurrencyProvider>
  )
}
