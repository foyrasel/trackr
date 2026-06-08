/**
 * Browser Push Notification Utilities for Trackr
 * Handles requesting permission, showing notifications, and checking support.
 */

// Request notification permission from the browser
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

// Show a local browser notification (no server push needed)
export function showNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return

  // Try service worker notification first (works when app is in background)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options,
      })
    })
  } else {
    // Fallback to regular notification
    new Notification(title, {
      icon: '/icons/icon-192.png',
      ...options,
    })
  }
}

// Check if notifications are supported in this browser
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

// Get the current notification permission state
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}
