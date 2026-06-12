'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        No internet connection. Trackr will reconnect automatically when you&apos;re back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
