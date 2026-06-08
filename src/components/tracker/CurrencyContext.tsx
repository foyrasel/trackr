'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface CurrencyContextType {
  currency: string
  currencySymbol: string
  setCurrency: (code: string, symbol: string) => void
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  currencySymbol: '$',
  setCurrency: () => {},
})

export const useCurrency = () => useContext(CurrencyContext)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')
  const [currencySymbol, setCurrencySymbolState] = useState('$')

  useEffect(() => {
    // Load from localStorage quickly
    const savedCurrency = localStorage.getItem('trackr_currency')
    const savedSymbol = localStorage.getItem('trackr_currency_symbol')
    if (savedCurrency) setCurrencyState(savedCurrency)
    if (savedSymbol) setCurrencySymbolState(savedSymbol)

    // Then fetch from server
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.currency) setCurrencyState(data.currency)
        if (data?.currencySymbol) setCurrencySymbolState(data.currencySymbol)
      })
      .catch(() => {})
  }, [])

  const setCurrency = useCallback((code: string, symbol: string) => {
    setCurrencyState(code)
    setCurrencySymbolState(symbol)
    localStorage.setItem('trackr_currency', code)
    localStorage.setItem('trackr_currency_symbol', symbol)
    // Persist to server
    fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency: code, currencySymbol: symbol }),
    }).catch(() => {})
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}
