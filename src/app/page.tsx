'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AddTransaction from '@/components/tracker/AddTransaction'
import Dashboard from '@/components/tracker/Dashboard'
import QuickSearch from '@/components/tracker/QuickSearch'
import TransactionList from '@/components/tracker/TransactionList'
import BudgetPanel from '@/components/tracker/BudgetPanel'
import LandingPage from '@/components/tracker/LandingPage'
import OnboardingScreen from '@/components/tracker/OnboardingScreen'
import AccountSetup from '@/components/tracker/AccountSetup'
import InsightsPanel from '@/components/tracker/InsightsPanel'
import MorePanel from '@/components/tracker/MorePanel'
import FeatureSetupScreen from '@/components/tracker/FeatureSetupScreen'
import TermsScreen from '@/components/tracker/TermsScreen'
import { CurrencyProvider, useCurrency } from '@/components/tracker/CurrencyContext'
import { useRecurringExecution } from '@/hooks/use-recurring-exec'
import { usePWA } from '@/hooks/use-pwa'
import ErrorBoundary from '@/components/ErrorBoundary'
import { LayoutDashboard, Plus, History, Lightbulb, Target, LogOut, Loader2, MoreHorizontal, Moon, Sun, Download, Search } from 'lucide-react'
import TrackrLogo from '@/components/tracker/TrackrLogo'

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
  // Track which tabs have ever been visited so we mount them lazily
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['dashboard']))
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userImage, setUserImage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showAccountSetup, setShowAccountSetup] = useState(false)
  const [showFeatureSetup, setShowFeatureSetup] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false)

  // PWA install
  const { canInstall, isInstalled, install } = usePWA()

  // Global quick search (Cmd+K or /)
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: session, status } = useSession()

  // Mark as mounted + handle PWA shortcut URLs (?tab=add etc.)
  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab) { setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next }); setActiveTab(tab) }
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

      // Show terms if not yet accepted, else check onboarding
      if (!localStorage.getItem('trackr_terms_accepted')) {
        setShowTerms(true)
      } else {
        checkOnboardingStatus(name, email, id)
      }
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

        if (!localStorage.getItem('trackr_terms_accepted')) {
          setShowTerms(true)
        } else {
          checkOnboardingStatus(savedName, savedEmail, savedId)
        }
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

    // Show terms if not yet accepted
    if (!localStorage.getItem('trackr_terms_accepted')) {
      setShowTerms(true)
      return
    }

    // Check onboarding status
    checkOnboardingStatus(name, email, id)
  }

  const handleTermsAccept = () => {
    localStorage.setItem('trackr_terms_accepted', new Date().toISOString())
    setShowTerms(false)
    checkOnboardingStatus(userName, userEmail, userId)
  }

  const handleTermsDecline = async () => {
    setShowTerms(false)
    setIsLoggedIn(false)
    localStorage.removeItem('trackr_user_name')
    localStorage.removeItem('trackr_user_email')
    localStorage.removeItem('trackr_user_id')
    try { await signOut({ redirect: false }) } catch {}
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

  const showFeatureSetupIfNeeded = () => {
    if (!localStorage.getItem('trackr_feature_setup_done')) {
      setShowFeatureSetup(true)
    }
  }

  const handleFeatureSetupComplete = () => {
    localStorage.setItem('trackr_feature_setup_done', 'true')
    setShowFeatureSetup(false)
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
    showFeatureSetupIfNeeded()
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
    showFeatureSetupIfNeeded()
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

  // Wrap tab navigation to track visited tabs for lazy mounting
  const navigateTab = useCallback((tab: string) => {
    setVisitedTabs(prev => { const next = new Set(prev); next.add(tab); return next })
    setActiveTab(tab)
  }, [])

  // Auto-execute due recurring transactions once per session
  useRecurringExecution(isLoggedIn ? userName : undefined, handleRefreshData)

  // Keyboard shortcuts: N = new transaction, / or Cmd+K = search
  useEffect(() => {
    if (!isLoggedIn) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(p => !p)
        return
      }
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' || e.key === 'N') navigateTab('add')
      if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLoggedIn])

  const handleTransactionAdded = () => {
    navigateTab('dashboard')
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
          <div className="mx-auto mb-4 drop-shadow-lg">
            <TrackrLogo size={64} />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
          <p className="text-xs text-muted-foreground mt-2 tracking-wide">Loading Trackr…</p>
        </div>
      </div>
    )
  }

  // Show landing page if not logged in
  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />
  }

  // Show terms & conditions for first-time users
  if (showTerms) {
    return <TermsScreen onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
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

  // Show optional feature setup screen once after account setup
  if (showFeatureSetup) {
    return <FeatureSetupScreen userName={userName} onComplete={handleFeatureSetupComplete} />
  }

  // Get user initials for avatar fallback
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const NAV_PILLS = [
    { tab: 'dashboard', label: 'Home',     Icon: LayoutDashboard },
    { tab: 'history',   label: 'History',  Icon: History },
    { tab: 'budget',    label: 'Budget',   Icon: Target },
    { tab: 'insights',  label: 'Insights', Icon: Lightbulb },
    { tab: 'more',      label: 'Settings', Icon: MoreHorizontal },
  ] as const

  return (
    <CurrencyProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── STICKY TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/97 dark:bg-gray-950/97 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/70 shadow-sm shadow-black/[0.02]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <button onClick={() => navigateTab('dashboard')} className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <TrackrLogo size={28} />
            <span className="hidden sm:block text-[14px] font-extrabold text-gray-900 dark:text-white tracking-tight">Trackr</span>
          </button>

          {/* Pill nav — centered, scrollable on small screens */}
          <nav className="flex-1 flex justify-center overflow-x-auto no-scrollbar" role="navigation" aria-label="Main navigation">
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800/70 rounded-2xl p-1 shrink-0">
              {NAV_PILLS.map(({ tab, label, Icon }) => (
                <button
                  key={tab}
                  onClick={() => navigateTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm font-semibold'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Right: search + dark mode + avatar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
              <kbd className="hidden md:inline font-mono text-[9px]">⌘K</kbd>
            </button>
            <button onClick={handleToggleDarkMode} className="h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle dark mode">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => navigateTab('more')} className="shrink-0" aria-label="Profile">
              <Avatar className="h-7 w-7">
                {userImage && <AvatarImage src={userImage} alt={userName} />}
                <AvatarFallback className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">{userInitials || '?'}</AvatarFallback>
              </Avatar>
            </button>
            <button onClick={handleLogout} className="h-8 w-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" aria-label="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <Tabs value={activeTab} onValueChange={navigateTab}>
        <main className="max-w-5xl mx-auto px-4 md:px-6 pt-5 pb-28">
          {/* Dashboard always mounted — it's the default tab */}
          <TabsContent value="dashboard" className="mt-0">
            <ErrorBoundary label="Dashboard">
              <Dashboard refreshTrigger={refreshTrigger} userName={userName} />
            </ErrorBoundary>
          </TabsContent>

          {/* Add — mount lazily on first visit, keep mounted afterwards */}
          <TabsContent value="add" className="mt-0 max-w-xl mx-auto">
            {visitedTabs.has('add') && (
              <ErrorBoundary label="Add Transaction">
                <AddTransaction onTransactionAdded={handleTransactionAdded} userName={userName} />
              </ErrorBoundary>
            )}
          </TabsContent>

          {/* Budget — lazy mount */}
          <TabsContent value="budget" className="mt-0">
            {visitedTabs.has('budget') && (
              <ErrorBoundary label="Budget">
                <BudgetPanel refreshTrigger={refreshTrigger} userName={userName} />
              </ErrorBoundary>
            )}
          </TabsContent>

          {/* History — lazy mount */}
          <TabsContent value="history" className="mt-0">
            {visitedTabs.has('history') && (
              <ErrorBoundary label="History">
                <TransactionList refreshTrigger={refreshTrigger} userName={userName} />
              </ErrorBoundary>
            )}
          </TabsContent>

          {/* Insights — lazy mount */}
          <TabsContent value="insights" className="mt-0">
            {visitedTabs.has('insights') && (
              <ErrorBoundary label="Insights">
                <InsightsPanel refreshTrigger={refreshTrigger} userName={userName} />
              </ErrorBoundary>
            )}
          </TabsContent>

          {/* Settings — lazy mount */}
          <TabsContent value="more" className="mt-0 max-w-xl mx-auto">
            {visitedTabs.has('more') && (
              <ErrorBoundary label="Settings">
                <MorePanel
                  userName={userName}
                  refreshTrigger={refreshTrigger}
                  onToggleDarkMode={handleToggleDarkMode}
                  isDarkMode={isDarkMode}
                />
              </ErrorBoundary>
            )}
          </TabsContent>
        </main>
      </Tabs>

      {/* ── FLOATING ACTION BUTTON ── */}
      <button
        onClick={() => navigateTab('add')}
        aria-label="Add transaction"
        className={`fixed z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
          activeTab === 'add'
            ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/40'
            : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50'
        }`}
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))', right: '1.5rem' }}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* ── INSTALL APP BANNER (PWA) ── */}
      {canInstall && !isInstalled && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-emerald-600 text-white text-xs font-medium rounded-2xl shadow-lg shadow-emerald-500/30 whitespace-nowrap">
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Install Trackr as an app</span>
          <button onClick={install} className="ml-1 px-3 py-1 bg-white/20 rounded-xl hover:bg-white/30 transition-colors font-semibold">Install</button>
        </div>
      )}

      {/* ── GLOBAL SEARCH ── */}
      <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} userName={userName} />
    </div>
    </CurrencyProvider>
  )
}
