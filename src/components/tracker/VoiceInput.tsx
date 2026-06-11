'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Loader2, Languages, Volume2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
  language: 'en' | 'bn' | 'hi'
  onLanguageChange: (lang: 'en' | 'bn' | 'hi') => void
}

// Language configurations with multiple fallback codes
const LANG_CONFIG = {
  en: {
    code: 'en-US',
    fallbackCodes: ['en-GB', 'en-IN'],
    label: 'English',
    hint: 'Listening in English...',
    tips: ['Speak clearly', 'Try: "Spent 500 taka on groceries"'],
  },
  bn: {
    code: 'bn-BD',
    fallbackCodes: ['bn-IN'],
    label: 'বাংলা',
    hint: 'বাংলায় শুনছি... ধীরে ও স্পষ্টভাবে বলুন',
    tips: ['ধীরে ও স্পষ্টভাবে বলুন', 'বলুন: "বাজারে ৫০০ টাকা খরচ"', 'শব্দগুলো আলাদা করে বলুন', 'চুলচেরা উচ্চারণ এড়িয়ে চলুন'],
  },
  hi: {
    code: 'hi-IN',
    fallbackCodes: ['en-IN'],
    label: 'हिन्दी',
    hint: 'हिन्दी में सुन रहे हैं... धीरे और स्पष्ट बोलें',
    tips: ['धीरे और स्पष्ट बोलें', 'बोलें: "बाजार में 500 रुपये खर्च"', 'शब्दों को अलग-अलग बोलें'],
  },
}

// Bangla digit mapping for post-processing
const BANGLA_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
}

// Common Bangla misrecognitions and corrections
const BANGLA_CORRECTIONS: [RegExp, string][] = [
  [/\bটাকা\b/g, 'টাকা'],
  [/\bটাকা\s*$/g, 'টাকা'],
  [/\bখরচ\b/g, 'খরচ'],
  [/\bবাজার\b/g, 'বাজার'],
  [/\bআয়\b/g, 'আয়'],
  [/\bকেনা\b/g, 'কেনা'],
]

// Convert Bangla digits to English for better parsing
function convertBanglaDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] || d)
}

// Post-process Bangla transcript to improve quality
function postProcessBangla(text: string): string {
  let processed = text
  
  // Convert Bangla digits to English for amount parsing
  processed = convertBanglaDigits(processed)
  
  // Common misrecognition fixes
  // "টগা" is often misrecognized for "টাকা"
  processed = processed.replace(/\bটগা\b/g, 'টাকা')
  processed = processed.replace(/\bটাগা\b/g, 'টাকা')
  processed = processed.replace(/\bটাখা\b/g, 'টাকা')
  
  // "খরচ" misrecognitions
  processed = processed.replace(/\bখরজ\b/g, 'খরচ')
  processed = processed.replace(/\bখরোচ\b/g, 'খরচ')
  
  // "বাজার" misrecognitions  
  processed = processed.replace(/\bবাজার\b/g, 'বাজার')
  processed = processed.replace(/\bবাজার\b/g, 'বাজার')
  
  // "লাখ" misrecognitions
  processed = processed.replace(/\bলখ\b/g, 'লাখ')
  processed = processed.replace(/\bলাখ\b/g, 'লাখ')
  
  // Clean up extra spaces
  processed = processed.replace(/\s+/g, ' ').trim()
  
  return processed
}

// Select the best alternative from recognition results
function selectBestAlternative(result: SpeechRecognitionResult): string {
  // If there's only one alternative, use it
  if (result.length <= 1) return result[0].transcript.trim()
  
  // For Bangla, pick the alternative with the highest confidence
  // that contains digits or financial keywords
  let bestIdx = 0
  let bestScore = 0
  
  for (let j = 0; j < result.length; j++) {
    const alt = result[j].transcript.trim()
    const conf = result[j].confidence || 0.5
    let score = conf
    
    // Boost score if it contains numbers (likely more accurate for financial input)
    if (/\d/.test(alt) || /[০-৯]/.test(alt)) score += 0.2
    
    // Boost score if it contains common financial keywords
    if (/টাকা|খরচ|আয়|কেনা|বাজার|লাখ|হাজার/.test(alt)) score += 0.15
    
    if (score > bestScore) {
      bestScore = score
      bestIdx = j
    }
  }
  
  return result[bestIdx].transcript.trim()
}

export default function VoiceInput({ onTranscript, isProcessing, language, onLanguageChange }: VoiceInputProps) {
  const [mounted, setMounted] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [confidence, setConfidence] = useState<number>(0)
  const [hasFinalResult, setHasFinalResult] = useState(false)
  const [silenceTimer, setSilenceTimer] = useState<number | null>(null)
  const [autoStopCountdown, setAutoStopCountdown] = useState<number | null>(null)
  const [usedLangCode, setUsedLangCode] = useState<string>('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const languageRef = useRef(language)
  const finalTranscriptRef = useRef<string>('')

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    languageRef.current = language
    if (recognitionRef.current) {
      recognitionRef.current.lang = LANG_CONFIG[language].code
    }
  }, [language])

  // Auto-stop countdown
  useEffect(() => {
    if (autoStopCountdown !== null && autoStopCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoStopCountdown(prev => prev !== null ? prev - 1 : null)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (autoStopCountdown === 0) {
      handleStop()
      setAutoStopCountdown(null)
    }
  }, [autoStopCountdown])

  // Initialize speech recognition after mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const supported = !!SpeechRecognition

    const pending = requestAnimationFrame(() => {
      setIsSupported(supported)
      setMounted(true)
    })

    if (!SpeechRecognition) {
      return () => cancelAnimationFrame(pending)
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = LANG_CONFIG[languageRef.current].code
    recognition.maxAlternatives = (languageRef.current === 'bn' || languageRef.current === 'hi') ? 8 : 3 // More alternatives for non-English
    
    let restartAttempts = 0
    const MAX_RESTARTS = 5 // Increased from 3

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let bestConfidence = 0

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]

        // Get the best confidence from all alternatives
        for (let j = 0; j < result.length; j++) {
          if (result[j].confidence > bestConfidence) {
            bestConfidence = result[j].confidence
          }
        }

        if (result.isFinal) {
          // Select the best alternative (smart selection for Bangla)
          let bestTranscript: string
          if (languageRef.current === 'bn') {
            bestTranscript = selectBestAlternative(result)
            bestTranscript = postProcessBangla(bestTranscript)
          } else {
            bestTranscript = result[0].transcript.trim()
          }
          
          finalTranscriptRef.current += bestTranscript + ' '
          setTranscript(finalTranscriptRef.current.trim())
          setHasFinalResult(true)
          setInterimText('')
          restartAttempts = 0

          // Reset auto-stop countdown when we get a result
          if (languageRef.current === 'bn') {
            setAutoStopCountdown(8) // Longer for Bangla since users may pause
          } else {
            setAutoStopCountdown(3)
          }

          // Send the accumulated final transcript
          onTranscriptRef.current(finalTranscriptRef.current.trim())
        } else {
          // Show interim results
          if (languageRef.current === 'bn') {
            // For Bangla, show the best interim alternative
            interimTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }
      }

      if (interimTranscript) {
        setInterimText(languageRef.current === 'bn' ? postProcessBangla(interimTranscript) : interimTranscript)
        setTranscript((finalTranscriptRef.current + interimTranscript).trim())
      }

      if (bestConfidence > 0) {
        setConfidence(Math.round(bestConfidence * 100))
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message)

      if (event.error === 'not-allowed') {
        setError(languageRef.current === 'bn'
          ? 'মাইক্রোফোন অ্যাক্সেস অস্বীকৃত। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে মাইক্রোফোন অ্যাক্সেস দিন।'
          : 'Microphone access denied. Please allow microphone access in browser settings.')
        setIsListening(false)
      } else if (event.error === 'no-speech') {
        // For Bangla, try to restart automatically more aggressively
        if (languageRef.current === 'bn' && restartAttempts < MAX_RESTARTS && finalTranscriptRef.current) {
          restartAttempts++
          try {
            recognition.stop()
            setTimeout(() => {
              try {
                recognition.start()
              } catch {
                // ignore
              }
            }, 200)
          } catch {
            // ignore
          }
        } else if (languageRef.current === 'bn' && restartAttempts < MAX_RESTARTS && !finalTranscriptRef.current) {
          // Even without a transcript, restart for Bangla (speech may be too quiet)
          restartAttempts++
          try {
            recognition.stop()
            setTimeout(() => {
              try {
                recognition.start()
              } catch {
                // ignore
              }
            }, 300)
          } catch {
            // ignore
          }
        } else if (!finalTranscriptRef.current) {
          setError(languageRef.current === 'bn'
            ? 'কোনো কথা শোনা যায়নি। ধীরে ও স্পষ্টভাবে বলুন। মাইকের কাছে কথা বলুন।'
            : 'No speech detected. Please speak clearly and closer to the mic.')
          setIsListening(false)
        }
      } else if (event.error === 'network') {
        setError(languageRef.current === 'bn'
          ? 'নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ পরীক্ষা করুন। ভয়েস রিকগনিশনের জন্য ইন্টারনেট প্রয়োজন।'
          : 'Network error. Voice recognition requires internet. Please check your connection.')
        setIsListening(false)
      } else if (event.error === 'aborted') {
        // Normal abort, don't show error
      } else if (event.error === 'language-unavailable') {
        // Try fallback language
        const config = LANG_CONFIG[languageRef.current]
        const currentCode = recognition.lang
        const fallbackIdx = config.fallbackCodes.indexOf(currentCode)
        const nextFallback = config.fallbackCodes[fallbackIdx + 1]
        
        if (nextFallback) {
          recognition.lang = nextFallback
          setUsedLangCode(nextFallback)
          try {
            recognition.start()
          } catch {
            setError(languageRef.current === 'bn'
              ? 'এই ভাষায় ভয়েস রিকগনিশন উপলব্ধ নয়।'
              : 'Voice recognition not available for this language.')
            setIsListening(false)
          }
        } else {
          setError(languageRef.current === 'bn'
            ? 'বাংলা ভয়েস রিকগনিশন এই ব্রাউজারে উপলব্ধ নয়। Chrome ব্যবহার করুন।'
            : 'Language not supported. Try Chrome browser.')
          setIsListening(false)
        }
      } else {
        setError(`Recognition error: ${event.error}`)
        setIsListening(false)
      }
    }

    recognition.onend = () => {
      if (isListening && !hasFinalResult && finalTranscriptRef.current === '' && restartAttempts < MAX_RESTARTS) {
        restartAttempts++
        setTimeout(() => {
          try {
            recognition.lang = LANG_CONFIG[languageRef.current].code
            recognition.start()
          } catch {
            setIsListening(false)
          }
        }, 300)
      } else {
        setIsListening(false)
        setAutoStopCountdown(null)
      }
    }

    recognition.onstart = () => {
      finalTranscriptRef.current = ''
      setHasFinalResult(false)
      setInterimText('')
      setConfidence(0)
      setUsedLangCode(recognition.lang)
    }

    recognitionRef.current = recognition

    return () => {
      cancelAnimationFrame(pending)
      recognition.abort()
    }
  }, [])

  const handleStop = useCallback(() => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
    } catch {
      // ignore
    }
    setIsListening(false)
    setAutoStopCountdown(null)
    setInterimText('')

    // If we have a final transcript, send it
    if (finalTranscriptRef.current.trim()) {
      onTranscriptRef.current(finalTranscriptRef.current.trim())
    }
  }, [])

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      handleStop()
    } else {
      setError(null)
      setTranscript('')
      setInterimText('')
      setRetryCount(0)
      setConfidence(0)
      setHasFinalResult(false)
      finalTranscriptRef.current = ''

      try {
        // Try the primary language code first
        recognitionRef.current.lang = LANG_CONFIG[language].code
        recognitionRef.current.maxAlternatives = (language === 'bn' || language === 'hi') ? 8 : 3
        recognitionRef.current.start()
        setIsListening(true)
        setUsedLangCode(LANG_CONFIG[language].code)
        // Set initial auto-stop countdown
        setAutoStopCountdown((language === 'bn' || language === 'hi') ? 20 : 10) // Longer for non-English
      } catch (err) {
        console.error('Failed to start recognition:', err)

        // Try fallback language codes
        const fallbacks = LANG_CONFIG[language].fallbackCodes
        let started = false

        for (const fallbackCode of fallbacks) {
          try {
            recognitionRef.current.lang = fallbackCode
            recognitionRef.current.start()
            setIsListening(true)
            setUsedLangCode(fallbackCode)
            started = true
            break
          } catch {
            // try next fallback
          }
        }

        if (!started) {
          if (retryCount < 3) {
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
            }, 500)
          } else {
            setError(language === 'bn'
              ? 'ভয়েস রিকগনিশন শুরু করা যায়নি। পেজ রিফ্রেশ করুন।'
              : 'Failed to start voice recognition. Please refresh the page.')
          }
        }
      }
    }
  }, [isListening, language, retryCount, handleStop])

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
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  ধীরে ও স্পষ্টভাবে কথা বলুন • বলা শেষে আবার ট্যাপ করুন
                </p>
                {usedLangCode && (
                  <p className="text-xs text-blue-400">
                    Language: {usedLangCode}
                  </p>
                )}
                {autoStopCountdown !== null && autoStopCountdown <= 5 && (
                  <p className="text-xs text-amber-500 font-medium">
                    আর {autoStopCountdown} সেকেন্ডে স্বয়ংক্রিয়ভাবে বন্ধ হবে...
                  </p>
                )}
              </div>
            )}
            {/* Confidence indicator */}
            {confidence > 0 && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <Volume2 className="w-3 h-3 text-muted-foreground" />
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      confidence > 70 ? 'bg-emerald-500' : confidence > 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                    {confidence}%</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'ট্যাপ করে বাংলায় কথা বলুন' : 'Tap to speak or type below'}
            </p>
            {language === 'bn' && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  সবচেয়ে ভালো ফলাফলের জন্য Chrome বা Edge ব্যবহার করুন
                </p>
                <p className="text-xs text-blue-400">
                  Tip: ধীরে বলুন, "বাজারে ৫০০ টাকা খরচ"
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Transcript */}
      {(transcript || interimText) && (
        <Card className="w-full max-w-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {language === 'bn' ? 'আপনি বলেছেন:' : 'You said:'}
            </p>
            <p className="text-base font-medium">
              {transcript}
              {interimText && !isProcessing && (
                <span className="text-muted-foreground italic">{interimText}</span>
              )}
            </p>
            {isListening && !hasFinalResult && (
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'কথা বলতে থাকুন... শেষে ট্যাপ করুন' : 'Keep speaking... tap again when done'}
              </p>
            )}
            {hasFinalResult && isListening && (
              <p className="text-xs text-emerald-600 mt-1">
                {language === 'bn' ? '✓ শোনা হয়েছে! আরও কিছু বলতে পারেন বা ট্যাপ করে শেষ করুন' : '✓ Heard! Speak more or tap to finish'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          {language === 'bn' && (error.includes('শোনা যায়নি') || error.includes('কথা')) && (
            <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800 font-medium mb-1">বাংলা ভয়েস টিপস:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 text-left">
                <li>• ধীরে ও স্পষ্টভাবে কথা বলুন</li>
                <li>• মাইকের ৩-৫ ইঞ্চি কাছে থাকুন</li>
                <li>• আধা বাংলা আধা ইংরেজি এড়িয়ে চলুন</li>
                <li>• "বাজারে ৫০০ টাকা খরচ" এভাবে বলুন</li>
                <li>• সম্পূর্ণ বাংলায় বলুন, ইংরেজি মিশাবেন না</li>
                <li>• পরিমাণ পরিষ্কারভাবে উচ্চারণ করুন</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
