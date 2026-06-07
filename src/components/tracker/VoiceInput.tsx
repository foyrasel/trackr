'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2, Languages } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
  language: 'en' | 'bn'
  onLanguageChange: (lang: 'en' | 'bn') => void
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

// Language configurations - try bn-IN as it often has better speech model support
const LANG_CONFIG = {
  en: { code: 'en-US', label: 'English', hint: 'Listening in English...' },
  bn: { code: 'bn-IN', label: 'বাংলা', hint: 'বাংলায় শুনছি... ধীরে কথা বলুন' },
}

export default function VoiceInput({ onTranscript, isProcessing, language, onLanguageChange }: VoiceInputProps) {
  const [mounted, setMounted] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const languageRef = useRef(language)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    languageRef.current = language
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_CONFIG[language].code
    }
  }, [language])

  // Initialize speech recognition after mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const supported = !!SpeechRecognition

    const pending = requestAnimationFrame(() => {
      setIsSupported(supported)
      setMounted(true)
    })

    if (!SpeechRecognition) return pending

    const recognition = new SpeechRecognition()
    // Use continuous mode for better Bangla recognition — allows longer utterances
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = LANG_CONFIG[languageRef.current].code
    // Set max alternatives to help with uncertain recognition
    recognition.maxAlternatives = 3

    let finalTranscriptAccumulator = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          // Use the most confident result
          const bestTranscript = result[0].transcript
          finalTranscriptAccumulator += bestTranscript + ' '
          setTranscript(finalTranscriptAccumulator.trim())
          // Send the accumulated final transcript
          onTranscriptRef.current(finalTranscriptAccumulator.trim())
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // Show interim results as user speaks
      if (interimTranscript) {
        setTranscript((finalTranscriptAccumulator + interimTranscript).trim())
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError(languageRef.current === 'bn' 
          ? 'মাইক্রোফোন অ্যাক্সেস অস্বীকৃত। অনুগ্রহ করে মাইক্রোফোন অ্যাক্সেস দিন।' 
          : 'Microphone access denied. Please allow microphone access.')
      } else if (event.error === 'no-speech') {
        setError(languageRef.current === 'bn' 
          ? 'কোনো কথা শোনা যায়নি। ধীরে ও স্পষ্টভাবে বলুন।' 
          : 'No speech detected. Please speak clearly and try again.')
      } else if (event.error === 'network') {
        setError(languageRef.current === 'bn'
          ? 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ পরীক্ষা করুন।'
          : 'Network error. Please check your internet connection.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onstart = () => {
      finalTranscriptAccumulator = ''
    }

    recognitionRef.current = recognition

    return () => {
      cancelAnimationFrame(pending)
      recognition.abort()
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setError(null)
      setTranscript('')
      setRetryCount(0)
      try {
        recognitionRef.current.lang = LANG_CONFIG[language].code
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        console.error('Failed to start recognition:', err)
        // If already started, stop and retry
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1)
          try {
            recognitionRef.current.stop()
          } catch {
            // ignore
          }
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
              setIsListening(true)
            } catch {
              setError(language === 'bn' 
                ? 'ভয়েস রিকগনিশন শুরু করা যায়নি। পেজ রিফ্রেশ করুন।' 
                : 'Failed to start voice recognition. Please refresh the page.')
            }
          }, 300)
        } else {
          setError(language === 'bn' 
            ? 'ভয়েস রিকগনিশন শুরু করা যায়নি। পেজ রিফ্রেশ করুন।' 
            : 'Failed to start voice recognition. Please refresh the page.')
        }
      }
    }
  }, [isListening, language, retryCount])

  if (!mounted) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-muted animate-pulse flex items-center justify-center">
          <Mic className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading voice input...</p>
      </div>
    )
  }

  const currentLang = LANG_CONFIG[language]

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Language Toggle */}
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-muted-foreground" />
        <div className="inline-flex rounded-lg border bg-card p-0.5 gap-0.5">
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              language === 'en'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange('bn')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              language === 'bn'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

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
          <p className="text-sm text-emerald-600 font-medium">
            {language === 'bn' ? 'AI আপনার ইনপুট প্রক্রিয়া করছে...' : 'AI is processing your input...'}
          </p>
        ) : isListening ? (
          <div className="space-y-1">
            <p className="text-sm text-red-600 font-medium animate-pulse">{currentLang.hint}</p>
            {language === 'bn' && (
              <p className="text-[10px] text-muted-foreground">
                ধীরে ও স্পষ্টভাবে কথা বলুন • বলা শেষে আবার ট্যাপ করুন
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'ট্যাপ করে বাংলায় কথা বলুন' : 'Tap to speak or type below'}
            </p>
            {language === 'bn' && (
              <p className="text-[10px] text-muted-foreground">
                ভয়েস চালু রাখতে ধীরে বলুন, বন্ধ করতে আবার ট্যাপ করুন
              </p>
            )}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      {transcript && (
        <Card className="w-full max-w-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {language === 'bn' ? 'আপনি বলেছেন:' : 'You said:'}
            </p>
            <p className="text-base font-medium">{transcript}</p>
            {isListening && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {language === 'bn' ? 'কথা বলতে থাকুন... শেষে ট্যাপ করুন' : 'Keep speaking... tap again when done'}
              </p>
            )}
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

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
