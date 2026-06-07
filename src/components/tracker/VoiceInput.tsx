'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
}

// Extend Window for webkitSpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

// Check support at module level
function checkSpeechSupport(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export default function VoiceInput({ onTranscript, isProcessing }: VoiceInputProps) {
  const isSupported = checkSpeechSupport()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  
  // Keep the ref updated via effect (not during render)
  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript)
        onTranscriptRef.current(finalTranscript)
      } else if (interimTranscript) {
        setTranscript(interimTranscript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.')
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [isSupported])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setError(null)
      setTranscript('')
      try {
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Failed to start recognition:', err)
        setError('Failed to start voice recognition. Please try again.')
      }
    }
  }, [isListening])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Microphone Button */}
      <button
        onClick={toggleListening}
        disabled={!isSupported || isProcessing}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
          ${isListening 
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' 
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95'
          }
          ${(!isSupported || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isProcessing ? (
          <Loader2 className="w-10 h-10 animate-spin" />
        ) : isListening ? (
          <>
            <MicOff className="w-10 h-10" />
            {/* Pulse animation rings */}
            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-30" />
            <span className="absolute inset-2 rounded-full border-2 border-red-300 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
          </>
        ) : (
          <Mic className="w-10 h-10" />
        )}
      </button>

      {/* Status Text */}
      <div className="text-center">
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            Voice input is not supported in this browser. Please use Chrome or Edge.
          </p>
        ) : isProcessing ? (
          <p className="text-sm text-emerald-600 font-medium">AI is processing your input...</p>
        ) : isListening ? (
          <p className="text-sm text-red-600 font-medium animate-pulse">Listening... Speak now</p>
        ) : (
          <p className="text-sm text-muted-foreground">Tap to speak or type below</p>
        )}
      </div>

      {/* Live Transcript */}
      {transcript && (
        <Card className="w-full max-w-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="text-base font-medium">{transcript}</p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
