'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import AddTransaction from '@/components/tracker/AddTransaction'
import Dashboard from '@/components/tracker/Dashboard'
import TransactionList from '@/components/tracker/TransactionList'
import BudgetPanel from '@/components/tracker/BudgetPanel'
import LoginScreen from '@/components/tracker/LoginScreen'
import { LayoutDashboard, Plus, History, Lightbulb, Target, LogOut } from 'lucide-react'
import InsightsPanel from '@/components/tracker/InsightsPanel'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const savedName = localStorage.getItem('trackr_user_name')
    if (savedName) {
      requestAnimationFrame(() => {
        setUserName(savedName)
        setIsLoggedIn(true)
      })
    }
  }, [])

  // Fetch userId after login
  useEffect(() => {
    if (isLoggedIn && !userId) {
      fetch('/api/accounts')
        .then(res => res.json())
        .then(data => {
          if (data.userId) setUserId(data.userId)
        })
        .catch(console.error)
    }
  }, [isLoggedIn, userId])

  const handleLogin = (name: string) => {
    setUserName(name)
    setIsLoggedIn(true)
    localStorage.setItem('trackr_user_name', name)
  }

  const handleLogout = () => {
    localStorage.removeItem('trackr_user_name')
    setUserName('')
    setUserId(null)
    setIsLoggedIn(false)
  }

  const handleTransactionAdded = () => {
    // Navigate to dashboard first, then refresh data with a small delay
    // to ensure DB writes are committed before fetching
    setActiveTab('dashboard')
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1)
    }, 300)
  }

  // Show login screen if not logged in
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <span className="text-white text-lg font-bold">৳</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Trackr</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {userName ? `Hi, ${userName}` : 'AI Voice Expense Tracker'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              BDT
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive h-8 w-8 p-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="add" className="mt-0">
            <AddTransaction onTransactionAdded={handleTransactionAdded} />
          </TabsContent>

          <TabsContent value="budget" className="mt-0">
            <BudgetPanel refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TransactionList refreshTrigger={refreshTrigger} />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <InsightsPanel refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t z-50">
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                value="insights"
                className="flex-col gap-0.5 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none px-1 py-2 flex-1"
              >
                <Lightbulb className="w-5 h-5" />
                <span className="text-[9px]">Insights</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </nav>
    </div>
  )
}
