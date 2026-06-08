'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (name: string) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<string | null>(null)

  const handleDemoLogin = async () => {
    const userName = name.trim() || 'User'
    setIsLoading(true)
    setLoginMethod('demo')
    try {
      // Use next-auth credentials provider to create a proper session
      const result = await signIn('credentials', {
        name: userName,
        redirect: false,
      })
      if (result?.ok) {
        onLogin(userName)
      } else {
        // Fallback: if next-auth fails, still allow login via localStorage
        onLogin(userName)
      }
    } catch {
      // Fallback to localStorage-based login
      onLogin(userName)
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

  const hasOAuthConfigured = 
    (process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === 'true') ||
    (process.env.NEXT_PUBLIC_FACEBOOK_CONFIGURED === 'true')

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <span className="text-white text-4xl font-bold">৳</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Trackr</h1>
          <p className="text-sm text-muted-foreground mt-1">AI Voice Expense Tracker</p>
          <p className="text-xs text-muted-foreground mt-0.5">বাংলাদেশের জন্য তৈরি • Made for Bangladesh</p>
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
              className="w-full h-12 flex items-center justify-center gap-3 text-sm font-medium border-gray-300 hover:bg-gray-50"
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
            </Button>

            {/* Facebook Login */}
            <Button
              onClick={handleFacebookLogin}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 flex items-center justify-center gap-3 text-sm font-medium bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#166FE5] hover:text-white"
            >
              {isLoading && loginMethod === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              Continue with Facebook
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or continue with name</span>
              </div>
            </div>

            {/* Demo Login */}
            <div className="space-y-3">
              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDemoLogin()}
                className="h-12 text-center"
                disabled={isLoading}
              />
              <Button
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isLoading && loginMethod === 'demo' ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Get Started
              </Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              No password needed. Your data stays on your device.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
