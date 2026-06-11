'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Loader2 } from 'lucide-react'

interface PasswordVerifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
  userName?: string
}

export default function PasswordVerifyDialog({
  open,
  onOpenChange,
  onVerified,
  userName,
}: PasswordVerifyDialogProps) {
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordVerifying, setPasswordVerifying] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleVerify = async () => {
    if (!passwordInput) return
    setPasswordVerifying(true)
    setPasswordError('')

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('trackr_user_email')
        const userId = localStorage.getItem('trackr_user_id')
        if (userEmail) headers['x-user-email'] = userEmail
        if (userId) headers['x-user-id'] = userId
      }
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ password: passwordInput }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.verified) {
          setPasswordInput('')
          setPasswordError('')
          onOpenChange(false)
          onVerified()
        } else {
          setPasswordError('Incorrect password. Please try again.')
        }
      } else {
        setPasswordError('Verification failed. Please try again.')
      }
    } catch {
      setPasswordError('Something went wrong. Please try again.')
    } finally {
      setPasswordVerifying(false)
    }
  }

  const handleCancel = () => {
    setPasswordInput('')
    setPasswordError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password Required
          </DialogTitle>
          <DialogDescription>
            Enter your account password to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Input
              type="password"
              placeholder="Enter your password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerify()
              }}
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-destructive mt-1.5">{passwordError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={passwordVerifying}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleVerify}
              disabled={!passwordInput || passwordVerifying}
            >
              {passwordVerifying ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-1" />
              )}
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
