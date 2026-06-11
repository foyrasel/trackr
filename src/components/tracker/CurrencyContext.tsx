'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface CurrencyContextType {
  currency: string
  currencySymbol: string
  language: string
  setCurrency: (code: string, symbol: string) => void
  setLanguage: (lang: string) => void
}

const LANGUAGE_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  en: { code: 'USD', symbol: '$' },
  bn: { code: 'BDT', symbol: '৳' },
  hi: { code: 'INR', symbol: '₹' },
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  currencySymbol: '$',
  language: 'en',
  setCurrency: () => {},
  setLanguage: () => {},
})

export const useCurrency = () => useContext(CurrencyContext)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')
  const [currencySymbol, setCurrencySymbolState] = useState('$')
  const [language, setLanguageState] = useState('en')

  useEffect(() => {
    // Load from localStorage quickly
    const savedCurrency = localStorage.getItem('trackr_currency')
    const savedSymbol = localStorage.getItem('trackr_currency_symbol')
    const savedLanguage = localStorage.getItem('trackr_language')
    if (savedCurrency) setCurrencyState(savedCurrency)
    if (savedSymbol) setCurrencySymbolState(savedSymbol)
    if (savedLanguage) setLanguageState(savedLanguage)

    // Then fetch from server
    fetch('/api/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.currency) setCurrencyState(data.currency)
        if (data?.currencySymbol) setCurrencySymbolState(data.currencySymbol)
        if (data?.language) {
          setLanguageState(data.language)
          localStorage.setItem('trackr_language', data.language)
        }
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

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang)
    localStorage.setItem('trackr_language', lang)
    // Auto-set corresponding currency
    const curr = LANGUAGE_CURRENCY_MAP[lang]
    if (curr) {
      setCurrencyState(curr.code)
      setCurrencySymbolState(curr.symbol)
      localStorage.setItem('trackr_currency', curr.code)
      localStorage.setItem('trackr_currency_symbol', curr.symbol)
      // Persist both language and currency to server
      fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, currency: curr.code, currencySymbol: curr.symbol }),
      }).catch(() => {})
    } else {
      // Just persist language
      fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      }).catch(() => {})
    }
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, language, setCurrency, setLanguage }}>
      {children}
    </CurrencyContext.Provider>
  )
}
