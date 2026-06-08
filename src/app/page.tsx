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
import InsightsPanel from '@/components/tracker/InsightsPanel'
import MorePanel from '@/components/tracker/MorePanel'
import { CurrencyProvider, useCurrency } from '@/components/tracker/CurrencyContext'
import { useRecurringExecution } from '@/hooks/use-recurring-exec'
import { LayoutDashboard, Plus, History, Lightbulb, Target, LogOut, Loader2, MoreHorizontal, Moon, Sun } from 'lucide-react'

function CurrencyDisplay() {
  const { currency } = useCurrency()
  return <>{currency}</>
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userImage, setUserImage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false)

  const { data: session, status } = useSession()

  // Mark as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch user settings (dark mode) after login
  useEffect(() => {
    if (isLoggedIn) {
      fetch('/api/user', {
        headers: userName ? { 'x-user-name': userName } : {},
      })
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
          }
        })
        .catch(console.error)
    }
  }, [isLoggedIn, userName])

  // Check for next-auth session (handles Google/Facebook OAuth redirect)
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUserName(session.user.name || 'User')
      setUserImage(session.user.image || null)
      setIsLoggedIn(true)
      localStorage.setItem('trackr_user_name', session.user.name || 'User')
      // Check if onboarding has been completed for OAuth users
      const onboardingDone = localStorage.getItem('trackr_onboarding_done')
      if (!onboardingDone) {
        setShowOnboarding(true)
      }
    }
  }, [session, status])

  // Check for existing session on mount (localStorage fallback for demo mode)
  useEffect(() => {
    if (status !== 'authenticated' && status !== 'loading') {
      const savedName = localStorage.getItem('trackr_user_name')
      if (savedName) {
        const onboardingDone = localStorage.getItem('trackr_onboarding_done')
        requestAnimationFrame(() => {
          setUserName(savedName)
          setIsLoggedIn(true)
          if (!onboardingDone) {
            setShowOnboarding(true)
          }
        })
      }
    }
  }, [status])

  // Fetch userId after login
  useEffect(() => {
    if (isLoggedIn && !userId) {
      fetch('/api/accounts', {
        headers: { 'x-user-name': userName },
      })
        .then(res => res.json())
        .then(data => {
          if (data.userId) setUserId(data.userId)
        })
        .catch(console.error)
    }
  }, [isLoggedIn, userId, userName])

  const handleLogin = (name: string) => {
    setUserName(name)
    setIsLoggedIn(true)
    localStorage.setItem('trackr_user_name', name)
    // Check if onboarding has been completed before
    const onboardingDone = localStorage.getItem('trackr_onboarding_done')
    if (!onboardingDone) {
      setShowOnboarding(true)
    }
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('trackr_onboarding_done', 'true')
    setShowOnboarding(false)
  }

  const handleLogout = async () => {
    localStorage.removeItem('trackr_user_name')
    setUserName('')
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
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(userName ? { 'x-user-name': userName } : {}) },
      body: JSON.stringify({ darkMode: newMode }),
    }).catch(console.error)
    // Also save to localStorage for quick load
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
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">T</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Trackr</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {userName ? `Hi, ${userName}` : 'AI Voice Expense Tracker'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
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
                <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">{userInitials}</AvatarFallback>
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
        <main className="max-w-2xl mx-auto px-4 pb-24 pt-4">
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard refreshTrigger={refreshTrigger} userName={userName} />
          </TabsContent>

          <TabsContent value="add" className="mt-0">
            <AddTransaction onTransactionAdded={handleTransactionAdded} userName={userName} />
          </TabsContent>

          <TabsContent value="budget" className="mt-0">
            <BudgetPanel refreshTrigger={refreshTrigger} userName={userName} />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TransactionList refreshTrigger={refreshTrigger} userName={userName} />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <InsightsPanel refreshTrigger={refreshTrigger} userName={userName} />
          </TabsContent>

          <TabsContent value="more" className="mt-0">
            <MorePanel
              userName={userName}
              refreshTrigger={refreshTrigger}
              onToggleDarkMode={handleToggleDarkMode}
              isDarkMode={isDarkMode}
            />
          </TabsContent>
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t dark:border-gray-800 z-50">
          <div className="max-w-2xl mx-auto">
            <TabsList className="w-full h-16 bg-transparent justify-around p-0 shadow-none">
              <TabsTrigger
                value="dashboard"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[9px]">Dashboard</span>
              </TabsTrigger>

              <TabsTrigger
                value="budget"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <Target className="w-5 h-5" />
                <span className="text-[9px]">Budget</span>
              </TabsTrigger>

              <TabsTrigger
                value="add"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1 relative"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center -mt-5 shadow-lg shadow-emerald-500/30">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-[9px]">Add</span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <History className="w-5 h-5" />
                <span className="text-[9px]">History</span>
              </TabsTrigger>

              <TabsTrigger
                value="more"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span className="text-[9px]">More</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </nav>
      </Tabs>
    </div>
    </CurrencyProvider>
  )
}
