'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (name: string, email?: string | null, userId?: string | null) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<string | null>(null)
  const [loginError, setLoginError] = useState('')
  const [googleConfigured, setGoogleConfigured] = useState(false)
  const [facebookConfigured, setFacebookConfigured] = useState(false)

  // Check if OAuth credentials are configured (non-dummy values)
  useEffect(() => {
    setGoogleConfigured(
      process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === 'true'
    )
    setFacebookConfigured(
      process.env.NEXT_PUBLIC_FACEBOOK_CONFIGURED === 'true'
    )
  }, [])

  const handleEmailLogin = async () => {
    setLoginError('')
    if (!email.trim() || !password.trim()) {
      setLoginError('Email and password are required')
      return
    }

    setIsLoading(true)
    setLoginMethod('email')
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password: password,
        redirect: false,
      })

      if (result?.ok) {
        try {
          const sessionRes = await fetch('/api/auth/session')
          const sessionData = await sessionRes.json()
          const displayName = sessionData?.user?.name || email.trim()
          const sessionId = sessionData?.user?.id || null
          localStorage.setItem('trackr_user_email', email.trim())
          if (sessionId) localStorage.setItem('trackr_user_id', sessionId)
          onLogin(displayName, email.trim(), sessionId)
        } catch {
          localStorage.setItem('trackr_user_email', email.trim())
          onLogin(email.trim(), email.trim())
        }
      } else {
        setLoginError('Invalid email or password. Please try again.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
      setLoginMethod(null)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setLoginMethod('google')
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      setIsLoading(false)
      setLoginMethod(null)
    }
  }

  const handleFacebookLogin = async () => {
    setIsLoading(true)
    setLoginMethod('facebook')
    try {
      await signIn('facebook', { callbackUrl: '/' })
    } catch {
      setIsLoading(false)
      setLoginMethod(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <span className="text-white text-4xl font-bold">T</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Trackr</h1>
          <p className="text-sm text-muted-foreground mt-1">AI Voice Expense Tracker</p>
          <p className="text-xs text-muted-foreground mt-0.5">Track money in any currency • Works everywhere</p>
        </div>

        {/* Login Card */}
        <Card className="border-2 border-emerald-100 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg">Welcome Back</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Login */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className={`w-full h-12 flex items-center justify-center gap-3 text-sm font-medium ${
                googleConfigured
                  ? 'border-gray-300 hover:bg-gray-50'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {isLoading && loginMethod === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
              {!googleConfigured && (
                <span className="text-xs text-muted-foreground ml-1">(setup needed)</span>
              )}
            </Button>

            {/* Facebook Login */}
            <Button
              onClick={handleFacebookLogin}
              disabled={isLoading}
              variant="outline"
              className={`w-full h-12 flex items-center justify-center gap-3 text-sm font-medium ${
                facebookConfigured
                  ? 'bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166FE5] hover:text-white'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              {isLoading && loginMethod === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              Continue with Facebook
              {!facebookConfigured && (
                <span className="text-xs text-muted-foreground ml-1">(setup needed)</span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or sign in with email</span>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-xs text-red-700 dark:text-red-300">{loginError}</p>
              </div>
            )}

            {/* Email & Password Login */}
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500"
                  disabled={isLoading}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                  className="h-11 pl-10 pr-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={handleEmailLogin}
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-base shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              >
                {isLoading && loginMethod === 'email' ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Sign In
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <button
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                Forgot Password?
              </button>
              <button
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
              >
                Create Account
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
