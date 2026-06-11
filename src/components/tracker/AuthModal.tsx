'use client'

import React, { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import {
  Mail, Lock, Eye, EyeOff, Loader2, X, Check, User,
} from 'lucide-react'
import TrackrLogo from './TrackrLogo'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultMode?: 'login' | 'signup'
  onLogin: (name: string, email?: string | null, id?: string | null) => void
}

// Real Google 4-color G logo SVG
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login', onLogin }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'verify' | 'forgot' | 'reset'>(defaultMode)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotResetCode, setForgotResetCode] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState(true)

  // Check if Google OAuth is configured
  useEffect(() => {
    fetch('/api/auth/providers')
      .then((r) => r.json())
      .then((providers) => setGoogleAvailable('google' in providers))
      .catch(() => setGoogleAvailable(false))
  }, [])

  // Sync mode when defaultMode changes (e.g. parent changes from login to signup)
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode)
      setError('')
      setSuccess('')
    }
  }, [defaultMode, isOpen])

  // Reset form on close
  const handleClose = () => {
    setMode(defaultMode)
    setName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setVerifyCode('')
    setVerificationCode('')
    setResetCode('')
    setNewPassword('')
    setForgotResetCode('')
    setError('')
    setSuccess('')
    setIsLoading(false)
    onClose()
  }

  const handleGoogleLogin = async () => {
    if (!googleAvailable) {
      setError('Google sign-in is not configured. Please use email & password instead.')
      return
    }
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch {
      setError('Google sign-in failed. Please try again.')
    }
  }

  const handleLogin = async () => {
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
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
        handleClose()
      } else {
        setError('Invalid email or password. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async () => {
    setError('')
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      })
      const data = await response.json()
      if (response.ok) {
        if (data.autoVerified) {
          // No email provider configured — user is verified immediately, log them in
          const result = await signIn('credentials', {
            email: email.trim(),
            password,
            redirect: false,
          })
          if (result?.ok) {
            try {
              const sessionRes = await fetch('/api/auth/session')
              const sessionData = await sessionRes.json()
              const sessionId = sessionData?.user?.id || null
              localStorage.setItem('trackr_user_email', email.trim())
              if (sessionId) localStorage.setItem('trackr_user_id', sessionId)
              onLogin(name.trim(), email.trim(), sessionId)
            } catch {
              localStorage.setItem('trackr_user_email', email.trim())
              onLogin(name.trim(), email.trim())
            }
            handleClose()
          } else {
            setError('Account created but login failed. Please log in manually.')
            setMode('login')
          }
        } else {
          // Email verification required
          setVerificationCode(data.verificationCode || '')
          setMode('verify')
        }
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: verifyCode }),
      })
      const data = await response.json()
      if (response.ok) {
        const result = await signIn('credentials', {
          email: email.trim(),
          password,
          redirect: false,
        })
        localStorage.setItem('trackr_user_email', email.trim())
        if (result?.ok) {
          try {
            const sessionRes = await fetch('/api/auth/session')
            const sessionData = await sessionRes.json()
            const sessionId = sessionData?.user?.id || null
            if (sessionId) localStorage.setItem('trackr_user_id', sessionId)
            onLogin(name.trim(), email.trim(), sessionId)
          } catch {
            onLogin(name.trim(), email.trim())
          }
        } else {
          onLogin(name.trim(), email.trim())
        }
        handleClose()
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSend = async () => {
    setError('')
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Invalid email format')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await response.json()
      if (response.ok) {
        if (data.resetCode) setForgotResetCode(data.resetCode)
        setMode('reset')
      } else {
        setError(data.error || 'Failed to send reset code')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setError('')
    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter the 6-digit reset code')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: resetCode, newPassword }),
      })
      const data = await response.json()
      if (response.ok) {
        setSuccess('Password reset successfully! You can now log in.')
        setForgotResetCode('')
        setResetCode('')
        setNewPassword('')
        setTimeout(() => {
          setSuccess('')
          setMode('login')
        }, 1500)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const modeTitle = {
    login: 'Welcome back',
    signup: 'Create your account',
    verify: 'Verify your email',
    forgot: 'Reset password',
    reset: 'Set new password',
  }[mode]

  const modeSubtitle = {
    login: 'Sign in to continue to Trackr',
    signup: 'Start tracking your money for free',
    verify: `We sent a code to ${email}`,
    forgot: 'Enter your email to receive a reset code',
    reset: `Enter the code sent to ${email}`,
  }[mode]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <div
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-8">
                {/* Logo + Header */}
                <div className="flex flex-col items-center mb-6">
                  <div className="mb-4 drop-shadow-md">
                    <TrackrLogo size={52} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{modeTitle}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">{modeSubtitle}</p>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3"
                    >
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LOGIN MODE */}
                {mode === 'login' && (
                  <div className="space-y-4">
                    {/* Google Button */}
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoading || !googleAvailable}
                      title={!googleAvailable ? 'Google login not configured on this server' : undefined}
                      className="w-full h-11 flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {/* OR divider */}
                    <div className="relative flex items-center">
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                      <span className="mx-3 text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                        or continue with email
                      </span>
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Primary button */}
                    <button
                      onClick={handleLogin}
                      disabled={isLoading}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Log In
                    </button>

                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => { setError(''); setMode('forgot') }}
                        className="text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                      <button
                        onClick={() => { setError(''); setMode('signup') }}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                      >
                        Don&apos;t have an account? Sign up
                      </button>
                    </div>
                  </div>
                )}

                {/* SIGNUP MODE */}
                {mode === 'signup' && (
                  <div className="space-y-4">
                    {/* Google Button */}
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoading || !googleAvailable}
                      title={!googleAvailable ? 'Google login not configured on this server' : undefined}
                      className="w-full h-11 flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-gray-300 dark:hover:border-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>

                    {/* OR divider */}
                    <div className="relative flex items-center">
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                      <span className="mx-3 text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                        or continue with email
                      </span>
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                    </div>

                    {/* Name */}
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 pl-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password (6+ characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Primary button */}
                    <button
                      onClick={handleSignup}
                      disabled={isLoading}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Create Account
                    </button>

                    <div className="text-center text-xs">
                      <button
                        onClick={() => { setError(''); setMode('login') }}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
                      >
                        Already have an account? Log in
                      </button>
                    </div>
                  </div>
                )}

                {/* VERIFY MODE */}
                {mode === 'verify' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                      <Mail className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Check your email</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        We sent a verification code to <strong>{email}</strong>
                      </p>
                    </div>

                    {/* Demo code display */}
                    {verificationCode && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Your verification code (email not configured)</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tracking-[0.3em]">{verificationCode}</p>
                      </div>
                    )}

                    <Input
                      placeholder="Enter 6-digit code"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-12 text-center text-lg tracking-[0.5em] font-bold border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                      maxLength={6}
                      disabled={isLoading}
                    />

                    <button
                      onClick={handleVerify}
                      disabled={isLoading || verifyCode.length !== 6}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Verify & Start
                    </button>

                    <button
                      onClick={() => { setError(''); setMode('signup') }}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      &larr; Back to sign up
                    </button>
                  </div>
                )}

                {/* FORGOT MODE */}
                {mode === 'forgot' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                      <Lock className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Reset your password</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enter your email and we&apos;ll send you a reset code
                      </p>
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 pl-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleForgotSend()}
                      />
                    </div>

                    <button
                      onClick={handleForgotSend}
                      disabled={isLoading}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send Reset Code
                    </button>

                    <button
                      onClick={() => { setError(''); setMode('login') }}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      &larr; Back to log in
                    </button>
                  </div>
                )}

                {/* RESET MODE */}
                {mode === 'reset' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                      <Mail className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Enter Reset Code</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        We sent a code to <strong>{email}</strong>
                      </p>
                    </div>

                    {/* Demo code display */}
                    {forgotResetCode && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Your reset code (email not configured)</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tracking-[0.3em]">{forgotResetCode}</p>
                      </div>
                    )}

                    <Input
                      placeholder="Enter 6-digit code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-12 text-center text-lg tracking-[0.5em] font-bold border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500"
                      maxLength={6}
                      disabled={isLoading}
                    />

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="New password (6+ characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-11 pl-10 pr-10 border-gray-200 dark:border-gray-700 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-500"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={handleReset}
                      disabled={isLoading || resetCode.length !== 6 || newPassword.length < 6}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-60"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Reset Password
                    </button>

                    <button
                      onClick={() => { setError(''); setMode('forgot') }}
                      className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      &larr; Back to enter email
                    </button>
                  </div>
                )}

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
                  By continuing, you agree to our{' '}
                  <span className="underline cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">Terms</span>
                  {' '}and{' '}
                  <span className="underline cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">Privacy Policy</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
