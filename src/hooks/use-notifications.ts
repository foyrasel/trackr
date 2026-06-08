'use client'

import { useEffect, useRef } from 'react'
import {
  requestNotificationPermission,
  showNotification,
  isNotificationSupported,
  getNotificationPermission,
} from '@/lib/notifications'

/**
 * Hook to check for overdue/upcoming reminders and weekly summary on mount.
 * Shows browser notifications only once per session (tracked via sessionStorage).
 */
export function useNotificationCheck(userName?: string) {
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current) return
    if (!userName) return
    if (!isNotificationSupported()) return
    if (getNotificationPermission() !== 'granted') return

    // Check if we already notified this session
    const sessionKey = `trackr_notified_${userName}`
    if (sessionStorage.getItem(sessionKey)) return

    hasChecked.current = true

    const checkRemindersAndNotify = async () => {
      try {
        // Fetch reminders
        const remindersRes = await fetch('/api/reminders', {
          headers: userName ? { 'x-user-name': userName } : {},
        })
        if (!remindersRes.ok) return
        const remindersData = await remindersRes.json()

        const reminders: Array<{
          title: string
          amount: number | null
          dueDate: string
          isPaid: boolean
          isDismissed: boolean
          daysUntilDue: number
          isDue: boolean
        }> = remindersData.reminders || []

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Find overdue or due-today/tomorrow reminders
        const urgentReminders = reminders.filter((r) => {
          if (r.isPaid || r.isDismissed) return false
          return r.daysUntilDue <= 1 // overdue, due today, or due tomorrow
        })

        if (urgentReminders.length > 0) {
          const count = urgentReminders.length
          const first = urgentReminders[0]
          const amountStr = first.amount != null ? ` — $${first.amount.toLocaleString()}` : ''
          showNotification('Trackr: Bill Reminder', {
            body: `You have ${count} bill${count > 1 ? 's' : ''} due! "${first.title}"${amountStr}`,
            tag: 'trackr-reminders',
          })
          sessionStorage.setItem(sessionKey, 'true')
          return
        }

        // Check weekly summary: if it's Monday and user hasn't seen summary
        const dayOfWeek = today.getDay() // 0=Sun, 1=Mon
        const weeklySummaryKey = `trackr_weekly_summary_${userName}_${today.getFullYear()}_W${getWeekNumber(today)}`
        if (dayOfWeek === 1 && !sessionStorage.getItem(weeklySummaryKey)) {
          try {
            const summaryRes = await fetch('/api/notifications?period=weekly', {
              headers: userName ? { 'x-user-name': userName } : {},
            })
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json()
              if (summaryData.summary) {
                const s = summaryData.summary
                showNotification('Trackr: Weekly Summary', {
                  body: `Income: $${s.totalIncome.toLocaleString()} | Expense: $${s.totalExpense.toLocaleString()} | Savings: ${s.savingsRate}%`,
                  tag: 'trackr-weekly-summary',
                })
                sessionStorage.setItem(weeklySummaryKey, 'true')
              }
            }
          } catch {
            // Silently fail for summary notification
          }
        }
      } catch (error) {
        console.error('[Notifications] Error checking reminders:', error)
      }
    }

    checkRemindersAndNotify()
  }, [userName])
}

/**
 * Get the ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Hook to request notification permission and show a test notification.
 * Returns the current permission state and a function to request permission.
 */
export function useNotificationPermission() {
  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermission()
    if (granted) {
      showNotification('Trackr: Notifications Enabled!', {
        body: 'You will now receive bill reminders and weekly summaries.',
        tag: 'trackr-test',
      })
    }
    return granted
  }

  return {
    isSupported: isNotificationSupported(),
    permission: getNotificationPermission(),
    requestPermission,
  }
}
