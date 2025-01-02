'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

export default function VoiceChat() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fullTranscriptRef = useRef('')
  const appRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const isSpeakingRef = useRef(false)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && !recognitionRef.current) {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true

          recognitionRef.current.onresult = (event) => {
            let finalTranscript = ''
            let interimTranscript = ''

            // Reset silence timeout since we're receiving speech
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current)
            }

            for (let i = 0; i < event.results.length; i++) {
              const result = event.results[i]
              if (result.isFinal) {
                finalTranscript += result[0].transcript + ' '
                isSpeakingRef.current = false
              } else {
                interimTranscript += result[0].transcript + ' '
                isSpeakingRef.current = true
              }
            }

            fullTranscriptRef.current = finalTranscript + interimTranscript
            setTranscript(fullTranscriptRef.current)

            // Set a new silence timeout
            silenceTimeoutRef.current = setTimeout(() => {
              if (!isSpeakingRef.current && isListening) {
                stopListening()
              }
            }, 10000) // 2 seconds of silence will trigger stop
          }

          recognitionRef.current.onend = () => {
            if (isListening) {
              try {
                recognitionRef.current.start()
              } catch (error) {
                console.error('Error restarting recognition:', error)
                setIsListening(false)
              }
            }
          }

          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error)
            if (event.error !== 'no-speech') {
              setIsListening(false)
            }
          }

          // Add speech start/end detection
          recognitionRef.current.onspeechstart = () => {
            isSpeakingRef.current = true
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current)
            }
          }

          recognitionRef.current.onspeechend = () => {
            isSpeakingRef.current = false
            // Set timeout to stop if no new speech is detected
            silenceTimeoutRef.current = setTimeout(() => {
              if (!isSpeakingRef.current && isListening) {
                stopListening()
              }
            }, 2000)
          }

        } else {
          console.error('Speech recognition not supported in this browser')
        }
      } catch (error) {
        console.error('Error initializing speech recognition:', error)
      }
    }

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.error('Error stopping recognition:', error)
        }
      }
    }
  }, [isListening])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startListening = () => {
    try {
      setTranscript('')
      fullTranscriptRef.current = ''
      isSpeakingRef.current = false
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      setIsListening(true)
      recognitionRef.current?.start()
    } catch (error) {
      console.error('Error starting recognition:', error)
      setIsListening(false)
    }
  }

  const stopListening = async () => {
    try {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      setIsListening(false)
      recognitionRef.current?.stop()
      
      if (fullTranscriptRef.current.trim()) {
        setIsLoading(true)
        setMessages(prev => [...prev, { type: 'user', text: fullTranscriptRef.current }])
        
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: fullTranscriptRef.current })
          })
          
          if (!response.ok) throw new Error('Failed to get response')

          const data = await response.json()
          setMessages(prev => [...prev, { type: 'ai', text: data.response }])
        } catch (error) {
          console.error('Error getting response:', error)
          setMessages(prev => [...prev, { 
            type: 'error', 
            text: 'Sorry, I encountered an error. Please try again.' 
          }])
        } finally {
          setIsLoading(false)
          fullTranscriptRef.current = ''
          setTranscript('')
        }
      }
    } catch (error) {
      console.error('Error stopping recognition:', error)
      setIsListening(false)
    }
  }

  return (
    <div 
      ref={appRef}
      className="chat-container"
      style={{ 
        WebkitUserSelect: 'none',
        userSelect: 'none',
        visibility: isScreenSharing ? 'hidden' : 'visible'
      }}
    >
      <div className="chat-content">
        <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
          {isScreenSharing && (
            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded-t-lg">
              Screen sharing active - Only visible to you
            </div>
          )}

          <div className="flex-1 overflow-y-auto message-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.type === 'user' 
                    ? 'bg-blue-100 ml-auto text-blue-900' 
                    : message.type === 'error'
                    ? 'bg-red-100 mr-auto text-red-900'
                    : 'bg-gray-100 mr-auto text-gray-900'
                }`}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: message.text }}
                  className="message-content"
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t p-2">
            <div className="bg-gray-100 p-2 rounded-lg min-h-[40px] text-sm text-gray-700">
              {transcript || 'Start speaking...'}
            </div>
            
            <div className="flex justify-center mt-2 pb-1">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-1" />
                    Processing...
                  </>
                ) : isListening ? (
                  <>
                    <MicOff className="w-4 h-4 mr-1" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-1" />
                    Start Recording
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

