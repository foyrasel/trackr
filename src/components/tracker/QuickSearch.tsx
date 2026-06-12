'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, ArrowUpRight, ArrowDownRight, X } from 'lucide-react'
import { useCurrency } from './CurrencyContext'

interface Txn {
  id: string
  type: string
  amount: number
  description: string
  category: string
  date: string
}

interface QuickSearchProps {
  open: boolean
  onClose: () => void
  userName?: string
}

export default function QuickSearch({ open, onClose, userName }: QuickSearchProps) {
  const { currencySymbol } = useCurrency()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Txn[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {}
    if (userName) h['x-user-name'] = userName
    if (typeof window !== 'undefined') {
      const e = localStorage.getItem('trackr_user_email')
      const i = localStorage.getItem('trackr_user_id')
      if (e) h['x-user-email'] = e
      if (i) h['x-user-id'] = i
    }
    return h
  }, [userName])

  // Focus input + reset when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSearched(false)
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Debounced search
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const res = await fetch(`/api/transactions?search=${encodeURIComponent(q)}&limit=20`, {
          headers: getAuthHeaders(),
          signal: ctrl.signal,
        })
        if (res.ok) {
          const d = await res.json()
          setResults(d.transactions || [])
          setSearched(true)
        }
      } catch {
        // aborted or offline — keep current results
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query, open, getAuthHeaders])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search transactions"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800">

        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
            : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search transactions… (description)"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <button onClick={onClose} aria-label="Close search" className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Type at least 2 characters to search all your transactions.
            </p>
          ) : results.length === 0 && searched && !loading ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No transactions match “{query.trim()}”.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {results.map(tx => (
                <li key={tx.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {tx.category} · {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {tx.type === 'income' ? '+' : '−'}{currencySymbol}{tx.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-muted-foreground bg-gray-50/60 dark:bg-gray-900/60">
          <span>Searches descriptions across all history</span>
          <span className="font-mono">Esc to close</span>
        </div>
      </div>
    </div>
  )
}
