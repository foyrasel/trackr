'use client'

import { useEffect, useRef } from 'react'

/**
 * Hook to check and execute due recurring transactions on app load.
 * Only runs once per session (tracked via sessionStorage).
 * If transactions are executed, it calls the onExecuted callback to refresh data.
 */
export function useRecurringExecution(userName?: string, onExecuted?: () => void) {
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current) return
    if (!userName) return

    // Check if we already ran this session
    const sessionKey = 'trackr_recurring_checked'
    if (sessionStorage.getItem(sessionKey)) return

    hasChecked.current = true

    const executeRecurring = async () => {
      try {
        const response = await fetch('/api/recurring/execute', {
          headers: userName ? { 'x-user-name': userName } : {},
        })

        if (response.ok) {
          const data = await response.json()
          // Mark as checked for this session, store count for banner
          sessionStorage.setItem(sessionKey, 'true')
          if (data.executedCount > 0) {
            sessionStorage.setItem('trackr_recurring_count', String(data.executedCount))
            if (onExecuted) onExecuted()
          }
        }
      } catch (error) {
        console.error('[Recurring] Error executing recurring transactions:', error)
        // Still mark as checked to avoid retrying on every render
        sessionStorage.setItem(sessionKey, 'true')
      }
    }

    executeRecurring()
  }, [userName, onExecuted])
}
