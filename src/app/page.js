'use client'
import { useEffect, useState } from 'react'
import VoiceChat from '../components/VoiceChat'

export default function Home() {
  const [isThisWindow, setIsThisWindow] = useState(true)

  useEffect(() => {
    // Generate a unique ID for this window
    const windowId = Math.random().toString(36).substring(7)
    localStorage.setItem('currentWindowId', windowId)

    // Check if this is the active window
    const checkWindow = () => {
      const activeWindowId = localStorage.getItem('currentWindowId')
      setIsThisWindow(activeWindowId === windowId)
    }

    // Listen for storage changes (other windows)
    window.addEventListener('storage', checkWindow)
    
    // Check periodically
    const interval = setInterval(checkWindow, 1000)

    return () => {
      window.removeEventListener('storage', checkWindow)
      clearInterval(interval)
    }
  }, [])

  if (!isThisWindow) {
    return (
      <div className="min-h-screen flex items-center justify-center hidden-from-capture">
        <p className="text-gray-500">
          AI Chat is active in another window
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-4 bg-gradient-to-b from-blue-100 to-white hidden-from-capture">
      <div className="max-w-4xl mx-auto">
        <VoiceChat />
      </div>
    </main>
  )
}

