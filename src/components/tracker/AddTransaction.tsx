'use client'

import React, { useState } from 'react'
import VoiceInput from './VoiceInput'
import TransactionConfirm, { CategorizedTransaction } from './TransactionConfirm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Type, Mic, Receipt } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AddTransactionProps {
  onTransactionAdded: () => void
}

export default function AddTransaction({ onTransactionAdded }: AddTransactionProps) {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
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
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error('Failed to categorize')
      }

      const data = await response.json()
      setCategorizedData(data.result)
      
      if (data.fallback) {
        toast({
          title: 'AI Unavailable',
          description: 'Using basic categorization. AI will improve suggestions when available.',
          variant: 'default',
        })
      }
    } catch (error) {
      console.error('Error processing input:', error)
      toast({
        title: 'Error',
        description: 'Failed to process your input. Please try again or enter manually.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirm = async (data: CategorizedTransaction) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save transaction')
      }

      toast({
        title: data.type === 'income' ? '💰 Income Added!' : '💸 Expense Recorded!',
        description: `৳${data.amount.toLocaleString()} - ${data.description}`,
      })

      setCategorizedData(null)
      setTextInput('')
      onTransactionAdded()
    } catch (error) {
      console.error('Error saving transaction:', error)
      toast({
        title: 'Error',
        description: 'Failed to save transaction. Please try again.',
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
            Voice
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
            Text
          </button>
        </div>
      </div>

      {/* Voice Input */}
      {inputMode === 'voice' && !categorizedData && (
        <div className="py-8">
          <VoiceInput onTranscript={handleTranscript} isProcessing={isProcessing} />
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Try saying: &quot;Spent 500 taka on groceries from cash&quot;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or: &quot;Income 50000 salary from job&quot;
            </p>
          </div>
        </div>
      )}

      {/* Text Input */}
      {inputMode === 'text' && !categorizedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              Describe Your Transaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Spent 500 taka on groceries from cash"
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
              {[
                'Spent 200 taka on transport',
                'Paid 15000 rent from debit',
                'Income 50000 salary',
                'Bought groceries for 800 taka cash',
                '500 taka on coffee',
              ].map((example) => (
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
