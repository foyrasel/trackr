'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  /** Whether the service worker has been registered */
  isRegistered: boolean;
  /** Whether the app can be installed (beforeinstallprompt was fired) */
  canInstall: boolean;
  /** Whether the app is currently installed (in standalone mode) */
  isInstalled: boolean;
  /** The deferred beforeinstallprompt event, used to trigger the install dialog */
  installPrompt: BeforeInstallPromptEvent | null;
  /** Trigger the browser's install prompt */
  install: () => Promise<void>;
}

/** Subscribe to changes in display-mode: standalone media query */
function subscribeToStandalone(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

/** Read whether the app is currently in standalone (installed) mode */
function getIsStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Server snapshot — always false */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook to register the service worker and expose PWA install functionality.
 *
 * Usage:
 * ```tsx
 * const { canInstall, install, isInstalled } = usePWA();
 *
 * return canInstall && !isInstalled ? (
 *   <button onClick={install}>Install App</button>
 * ) : null;
 * ```
 */
export function usePWA(): PWAState {
  const [isRegistered, setIsRegistered] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Detect if the app is installed via useSyncExternalStore (no sync setState in effect)
  const isInstalled = useSyncExternalStore(
    subscribeToStandalone,
    getIsStandaloneSnapshot,
    getServerSnapshot,
  );

  // Register the service worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Every hour

        setIsRegistered(true);
        console.log('[PWA] Service worker registered successfully');
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    registerSW();
  }, []);

  // Listen for the beforeinstallprompt event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      // Prevent the default mini-infobar
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt captured');
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Listen for appinstalled event to clear install prompt state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setCanInstall(false);
      setInstallPrompt(null);
      console.log('[PWA] App installed');
    };

    window.addEventListener('appinstalled', handler);

    return () => {
      window.removeEventListener('appinstalled', handler);
    };
  }, []);

  // Trigger the install prompt
  const install = useCallback(async () => {
    if (!installPrompt) {
      console.warn('[PWA] No install prompt available');
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);

      // Clean up regardless of outcome
      setInstallPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
    }
  }, [installPrompt]);

  return {
    isRegistered,
    canInstall,
    isInstalled,
    installPrompt,
    install,
  };
}
