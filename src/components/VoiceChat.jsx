'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'

export default function VoiceChat() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        setTranscript(transcriptText)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startListening = () => {
    setTranscript('')
    setIsListening(true)
    recognitionRef.current.start()
  }

  const stopListening = async () => {
    setIsListening(false)
    recognitionRef.current.stop()
    
    if (transcript.trim()) {
      setIsLoading(true)
      // Add user message
      setMessages(prev => [...prev, { type: 'user', text: transcript }])
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: transcript })
        })
        
        if (!response.ok) {
          throw new Error('Failed to get response')
        }

        const data = await response.json()
        
        // Add AI response
        setMessages(prev => [...prev, { type: 'ai', text: data.response }])
      } catch (error) {
        console.error('Error getting response:', error)
        setMessages(prev => [...prev, { type: 'error', text: 'Sorry, I encountered an error. Please try again.' }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 bg-white p-6 rounded-lg shadow-lg">
        <div className="h-96 overflow-y-auto space-y-4 pr-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-100 ml-auto max-w-[80%]' 
                  : message.type === 'error'
                  ? 'bg-red-100 mr-auto max-w-[80%]'
                  : 'bg-gray-100 mr-auto max-w-[80%]'
              }`}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: message.text }}
                className="prose prose-sm max-w-none"
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="border-t pt-4">
          <div className="bg-gray-100 p-3 rounded-lg min-h-[60px]">
            {transcript || 'Start speaking...'}
          </div>
          
          <div className="flex justify-center mt-4">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
              className={`px-6 py-2 rounded-full font-medium flex items-center ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Processing...
                </>
              ) : isListening ? (
                <>
                  <MicOff className="mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="mr-2" />
                  Start Recording
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

