'use client'
import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import CopyButton from './CopyButton'

export default function VoiceChat() {
  const checkBrowserSupport = () => {
    return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  };

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
  const isRecognitionActiveRef = useRef(false)
  const wakeLockRef = useRef(null)
  const retryTimeoutRef = useRef(null)
  const maxRetryAttemptsRef = useRef(3)
  const currentRetryAttemptRef = useRef(0)
  const [textInput, setTextInput] = useState('')
  const audioContextRef = useRef(null)
  const audioStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)

  // Add wake lock functionality
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    }
  };

  // Modify the speech recognition initialization
  useEffect(() => {
    if (!checkBrowserSupport()) {
      setMessages([{
        type: 'error',
        text: 'Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.'
      }]);
      return;
    }
    
    const initializeSpeechRecognition = () => {
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

              // Reset silence detection
              if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
              silenceTimeoutRef.current = setTimeout(() => {
                if (!isSpeakingRef.current && isListening) {
                  stopListening()
                }
              }, 2000)
            }

            recognitionRef.current.onend = () => {
              isRecognitionActiveRef.current = false
              if (isListening) {
                try {
                  // Add small delay before restarting
                  setTimeout(() => {
                    if (isListening && !isRecognitionActiveRef.current) {
                      recognitionRef.current.start()
                      isRecognitionActiveRef.current = true
                    }
                  }, 200)
                } catch (error) {
                  console.error('Error restarting recognition:', error)
                  setIsListening(false)
                }
              }
            }

            recognitionRef.current.onerror = (event) => {
              console.error('Speech recognition error:', event.error)
              if (event.error === 'not-allowed') {
                setIsListening(false)
              } else if (event.error !== 'no-speech') {
                // Attempt to restart on other errors
                setTimeout(() => {
                  if (isListening && !isRecognitionActiveRef.current) {
                    try {
                      recognitionRef.current.start()
                      isRecognitionActiveRef.current = true
                    } catch (error) {
                      console.error('Error restarting after error:', error)
                      setIsListening(false)
                    }
                  }
                }, 1000)
              }
            }
          }
        } catch (error) {
          console.error('Error initializing speech recognition:', error)
        }
      }
    }

    initializeSpeechRecognition()

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          isRecognitionActiveRef.current = false
        } catch (error) {
          console.error('Error stopping recognition:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Modify startListening function
  const startListening = async () => {
    try {
      await requestWakeLock();
      setTranscript('');
      fullTranscriptRef.current = '';
      isSpeakingRef.current = false;
      currentRetryAttemptRef.current = 0;
      
      // Reset and reinitialize recognition for each session on mobile
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping existing recognition:', e);
        }
      }

      // Create new instance for each session
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Mobile-optimized settings
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;
      recognitionRef.current.lang = 'en-US';

      // Set up event handlers
      setupRecognitionHandlers();

      setIsListening(true);
      await recognitionRef.current.start();
      isRecognitionActiveRef.current = true;

    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);
      isRecognitionActiveRef.current = false;
      await releaseWakeLock();
    }
  };

  // Add new function to setup recognition handlers
  const setupRecognitionHandlers = () => {
    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
          isSpeakingRef.current = false;
          currentRetryAttemptRef.current = 0; // Reset retry counter on successful recognition
        } else {
          interimTranscript += result[0].transcript + ' ';
          isSpeakingRef.current = true;
        }
      }

      fullTranscriptRef.current = finalTranscript + interimTranscript;
      setTranscript(fullTranscriptRef.current);

      // Longer silence timeout for mobile
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (!isSpeakingRef.current && isListening) {
          stopListening();
        }
      }, 3000); // Increased timeout for mobile
    };

    recognitionRef.current.onend = async () => {
      isRecognitionActiveRef.current = false;
      if (isListening && currentRetryAttemptRef.current < maxRetryAttemptsRef.current) {
        currentRetryAttemptRef.current++;
        // Add exponential backoff for retries
        const backoffTime = Math.min(1000 * Math.pow(2, currentRetryAttemptRef.current - 1), 5000);
        
        retryTimeoutRef.current = setTimeout(async () => {
          try {
            if (isListening && !isRecognitionActiveRef.current) {
              await recognitionRef.current.start();
              isRecognitionActiveRef.current = true;
            }
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsListening(false);
            await releaseWakeLock();
          }
        }, backoffTime);
      } else {
        setIsListening(false);
        await releaseWakeLock();
      }
    };

    recognitionRef.current.onerror = async (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setIsListening(false);
        await releaseWakeLock();
      }
    };
  };

  // Modify stopListening function
  const stopListening = async () => {
    try {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      setIsListening(false);
      
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        recognitionRef.current.stop();
        isRecognitionActiveRef.current = false;
      }

      await releaseWakeLock();

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
      console.error('Error stopping recognition:', error);
      setIsListening(false);
      isRecognitionActiveRef.current = false;
      await releaseWakeLock();
    }
  };

  // Function to format code blocks
  const formatCodeBlock = (text) => {
    return text.replace(
      /```(\w*)([\s\S]*?)```/g,
      (match, language, code) => {
        // Remove any HTML entities
        code = code.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .trim();
        
        return `
          <div class="code-block">
            <div class="code-header">
              <span class="language-tag">${language || 'code'}</span>
            </div>
            <pre><code class="${language}">${code}</code></pre>
          </div>
        `;
      }
    );
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      releaseWakeLock();
    };
  }, []);

  // Add this new function to handle text submissions
  const handleTextSubmit = async (e) => {
    e.preventDefault()
    if (!textInput.trim()) return

    setIsLoading(true)
    setMessages(prev => [...prev, { type: 'user', text: textInput }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textInput })
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
      setTextInput('')
    }
  }

  const processAudioChunk = async (blob) => {
    try {
      // Convert blob to base64 with proper formatting
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = reader.result;
            
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio })
            });
            
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Transcription failed');
            }
            
            const { transcript } = await response.json();
            if (transcript && transcript.trim()) {
              setTranscript(prev => {
                const newTranscript = prev + ' ' + transcript.trim();
                console.log('New transcript:', newTranscript); // Debug log
                return newTranscript;
              });
            }
          } catch (error) {
            console.error('Error processing audio:', error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  };

  const startSystemAudioCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'tab'
          }
        },
        video: false
      });

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // Optimize for speech recognition
      });
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const destination = audioContextRef.current.createMediaStreamDestination();
      source.connect(destination);
      audioStreamRef.current = destination.stream;

      // Configure MediaRecorder with optimal settings for Whisper
      mediaRecorderRef.current = new MediaRecorder(audioStreamRef.current, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      });

      let audioChunks = [];
      const CHUNK_SIZE = 4; // Number of chunks to collect before processing

      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Process when we have enough chunks
          if (audioChunks.length >= CHUNK_SIZE) {
            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            await processAudioChunk(blob);
            audioChunks = []; // Reset chunks
          }
        }
      };

      // Start recording in smaller chunks
      mediaRecorderRef.current.start(500); // Capture every 500ms
      setIsSystemAudioEnabled(true);

    } catch (error) {
      console.error('Error capturing system audio:', error);
      alert('System audio capture requires Chrome with "System Audio Capture" enabled in chrome://flags');
    }
  };

  return (
    <div 
      ref={appRef}
      className="chat-container"
      style={{ 
        visibility: isScreenSharing ? 'hidden' : 'visible'
      }}
    >
      <div className="chat-content">
        <div className="flex flex-col h-full bg-[#0d1b2a] rounded-lg shadow-lg">
          {isScreenSharing && (
            <div className="bg-[#1e2a3a] text-[#d1d5db] px-2 py-1 text-xs rounded-t-lg">
              Screen sharing active - Only visible to you
            </div>
          )}

          <div className="flex-1 overflow-y-auto message-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message group ${
                  message.type === 'user' 
                    ? 'bg-[#1e2a3a] ml-auto text-[#ffffff]' 
                    : message.type === 'error'
                    ? 'bg-[#2d1f1f] mr-auto text-[#ffa6a6]'
                    : 'bg-[#162436] mr-auto text-[#ffffff]'
                }`}
              >
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={
                    message.type === 'ai' 
                      ? message.text.replace(/```[\s\S]*?```/g, '')
                      : message.text
                  } />
                </div>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: message.type === 'ai' 
                      ? formatCodeBlock(message.text)
                      : message.text
                  }}
                  className="message-content"
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t border-[#1e2a3a] p-2 bg-[#0d1b2a]">
            <div className="bg-[#162436] p-2 rounded-lg min-h-[40px] text-sm text-[#72757a]">
              {transcript || 'Start speaking or type your question...'}
            </div>
            
            <form onSubmit={handleTextSubmit} className="mt-2 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your question here..."
                className="flex-1 px-3 py-1.5 border border-[#1e2a3a] rounded-lg text-sm 
                         bg-[#162436] text-[#d1d5db] placeholder-[#6b7280]
                         focus:outline-none focus:ring-2 focus:ring-[#272829]
                         disabled:opacity-50"
                disabled={isListening || isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || isListening || !textInput.trim()}
                className="px-4 py-1.5 bg-[#3c4b56] hover:bg-[#3d4b55] text-[#0d1b2a] 
                         rounded-lg text-sm font-medium 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200"
              >
                Send
              </button>
            </form>
            
            <div className="flex justify-center mt-2 pb-1">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isLoading}
                className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center
                          transition-colors duration-200 ${
                  isListening 
                    ? 'bg-[#6d5a5a] hover:bg-[#432121] text-[#d1d5db]' 
                    : 'bg-[#36444f] hover:bg-[#203e56] text-[#0d1b2a]'
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

