'use client'

import React, { useState } from 'react'
import VoiceInput from './VoiceInput'
import TransactionConfirm, { CategorizedTransaction } from './TransactionConfirm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Type, Mic, Receipt } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useCurrency } from './CurrencyContext'

interface AddTransactionProps {
  onTransactionAdded: () => void
  userName?: string
}

const BANGLA_EXAMPLES = [
  'à¦¬à¦¾à¦œà¦¾à¦°à§‡ à§«à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾ à¦–à¦°à¦š',
  'à¦¬à¦¾à¦¸à¦¾ à¦­à¦¾à¦¡à¦¼à¦¾ à§§à§«à§¦à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾',
  'à¦—à¦¤à¦•à¦¾à¦² à¦°à¦¿à¦•à¦¶à¦¾à¦¯à¦¼ à§§à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾',
  'à¦¬à§‡à¦¤à¦¨ à¦ªà§‡à¦¯à¦¼à§‡à¦›à¦¿ à§«à§¦à§¦à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾',
  'à¦—à¦¤ à¦¶à§à¦•à§à¦°à¦¬à¦¾à¦° à¦¬à¦¾à¦œà¦¾à¦°à§‡ à§¨à§¦à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾',
]

const ENGLISH_EXAMPLES = [
  'Spent 200 on transport',
  'Paid 1500 rent from debit yesterday',
  'Income 5000 salary',
  'Bought groceries for 800 cash',
  'Last Friday 50 on coffee',
]

export default function AddTransaction({ onTransactionAdded, userName }: AddTransactionProps) {
  const { currencySymbol } = useCurrency()
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [language, setLanguage] = useState<'en' | 'bn'>('en') // Default to English for international app
  const [textInput, setTextInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [categorizedData, setCategorizedData] = useState<CategorizedTransaction | null>(null)

  const handleTranscript = async (text: string) => {
    await processInput(text)
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return
    await processInput(textInput.trim())
  }

  const processInput = async (text: string) => {
    setIsProcessing(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Failed to categorize')
      }

      const data = await response.json()
      setCategorizedData(data.result)
      
      if (data.fallback) {
        toast({
          title: language === 'bn' ? 'AI à¦…à¦¨à§à¦ªà¦²à¦¬à§à¦§' : 'AI Unavailable',
          description: language === 'bn' 
            ? 'à¦¸à¦¾à¦§à¦¾à¦°à¦£ à¦¶à§à¦°à§‡à¦£à§€à¦¬à¦¿à¦­à¦¾à¦— à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦¹à¦šà§à¦›à§‡à¥¤' 
            : 'Using basic categorization. AI will improve suggestions when available.',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('Error processing input:', error)
      toast({
        title: language === 'bn' ? 'à¦¤à§à¦°à§à¦Ÿà¦¿' : 'Error',
        description: language === 'bn' 
          ? 'à¦†à¦ªà¦¨à¦¾à¦° à¦‡à¦¨à¦ªà§à¦Ÿ à¦ªà§à¦°à¦•à§à¦°à¦¿à¦¯à¦¼à¦¾ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§à¦¨à¥¤' 
          : 'Failed to process your input. Please try again or enter manually.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async (data: CategorizedTransaction) => {
    setIsSaving(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (userName) headers['x-user-name'] = userName
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save transaction')
      }

      const today = new Date().toISOString().split('T')[0]
      const isPastDate = data.date && data.date !== today
      toast({
        title: data.type === 'income' 
          ? (language === 'bn' ? 'ðŸ’° à¦†à¦¯à¦¼ à¦¯à§‹à¦— à¦¹à¦¯à¦¼à§‡à¦›à§‡!' : 'ðŸ’° Income Added!') 
          : (language === 'bn' ? 'ðŸ’¸ à¦–à¦°à¦š à¦°à§‡à¦•à¦°à§à¦¡ à¦¹à¦¯à¦¼à§‡à¦›à§‡!' : 'ðŸ’¸ Expense Recorded!'),
        description: isPastDate
          ? `${currencySymbol}${data.amount.toLocaleString()} - ${data.description} (${new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          : `${currencySymbol}${data.amount.toLocaleString()} - ${data.description}`,
      })

      setCategorizedData(null)
      setTextInput('')
      onTransactionAdded()
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast({
        title: language === 'bn' ? 'à¦¤à§à¦°à§à¦Ÿà¦¿' : 'Error',
        description: language === 'bn' 
          ? 'à¦²à§‡à¦¨à¦¦à§‡à¦¨ à¦¸à¦‚à¦°à¦•à§à¦·à¦£ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤' 
          : 'Failed to save transaction. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReject = () => {
    setCategorizedData(null)
    setTextInput('')
  }

  const examples = language === 'bn' ? BANGLA_EXAMPLES : ENGLISH_EXAMPLES

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
          <button
            onClick={() => setInputMode('voice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === 'voice'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="w-4 h-4" />
            {language === 'bn' ? 'à¦­à¦¯à¦¼à§‡à¦¸' : 'Voice'}
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === 'text'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Type className="w-4 h-4" />
            {language === 'bn' ? 'à¦Ÿà§‡à¦•à§à¦¸à¦Ÿ' : 'Text'}
          </button>
        </div>
      </div>

      {/* Voice Input */}
      {inputMode === 'voice' && !categorizedData && (
        <div className="py-8">
          <VoiceInput 
            onTranscript={handleTranscript} 
            isProcessing={isProcessing}
            language={language}
            onLanguageChange={setLanguage}
          />
          <div className="mt-6 text-center">
            {language === 'bn' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  à¦‰à¦šà§à¦šà¦¾à¦°à¦£ à¦•à¦°à§à¦¨: &quot;à¦¬à¦¾à¦œà¦¾à¦°à§‡ à§«à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾ à¦–à¦°à¦š&quot;
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  à¦…à¦¥à¦¬à¦¾: &quot;à¦—à¦¤à¦•à¦¾à¦² à¦°à¦¿à¦•à¦¶à¦¾à¦¯à¦¼ à§§à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾&quot;
                </p>
                <p className="text-[10px] text-blue-500 mt-1">
                  à¦¤à¦¾à¦°à¦¿à¦– à¦¬à¦²à¦²à§‡ à¦¸à§‡à¦Ÿà¦¾ à¦…à¦Ÿà§‹à¦®à§‡à¦Ÿà¦¿à¦• à¦¸à§‡à¦Ÿ à¦¹à¦¬à§‡
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Try saying: &quot;Spent 500 on groceries from cash&quot;
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or: &quot;Paid 200 yesterday for transport&quot;
                </p>
                <p className="text-[10px] text-blue-500 mt-1">
                  Mention date &quot;yesterday&quot;, &quot;last Friday&quot; â€” it will be auto-set
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && !categorizedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              {language === 'bn' ? 'à¦²à§‡à¦¨à¦¦à§‡à¦¨ à¦¬à¦°à§à¦£à¦¨à¦¾ à¦•à¦°à§à¦¨' : 'Describe Your Transaction'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Language toggle for text mode */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setLanguage('bn')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  language === 'bn'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                à¦¬à¦¾à¦‚à¦²à¦¾
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  language === 'en'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                English
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={language === 'bn' 
                  ? 'à¦¯à§‡à¦®à¦¨: à¦—à¦¤à¦•à¦¾à¦² à¦¬à¦¾à¦œà¦¾à¦°à§‡ à§«à§¦à§¦ à¦Ÿà¦¾à¦•à¦¾ à¦–à¦°à¦š' 
                  : 'e.g., Spent 500 on groceries yesterday'
                }
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                className="flex-1"
                disabled={isProcessing}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => setTextInput(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Card */}
      {categorizedData && (
        <TransactionConfirm
          data={categorizedData}
          onConfirm={handleConfirm}
          onReject={handleReject}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}

