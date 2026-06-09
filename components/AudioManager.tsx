'use client'
import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface Props {
  audioEvents: Array<{
    id: string
    text: string
    timestamp: number
    voice?: string
  }>
}

export function AudioManager({ audioEvents }: Props) {
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const playedEventsRef = useRef<Set<string>>(new Set())
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)

  // Process new audio events  
  useEffect(() => {
    if (isMuted || audioEvents.length === 0) return

    // Get the most recent audio event
    const latestEvent = audioEvents[0] // audioEvents are sorted with newest first
    
    // Only play if this is a truly new event (within last 10 seconds)
    const isRecentEvent = (Date.now() - latestEvent.timestamp) < 10000
    
    if (isRecentEvent && !playedEventsRef.current.has(latestEvent.id)) {
      playedEventsRef.current.add(latestEvent.id)
      queueAudio(latestEvent.text, latestEvent.voice)
      
      // Clean up old played events (keep last 50)
      if (playedEventsRef.current.size > 50) {
        const oldIds = Array.from(playedEventsRef.current).slice(0, -25)
        oldIds.forEach(id => playedEventsRef.current.delete(id))
      }
    }
  }, [audioEvents, isMuted])

  // Queue audio for sequential playback
  const queueAudio = async (text: string, voice?: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
      })

      if (response.ok) {
        const { audioUrl } = await response.json()
        audioQueueRef.current.push(audioUrl)
        processAudioQueue()
      }
    } catch (error) {
      console.warn('Audio generation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Process audio queue sequentially
  const processAudioQueue = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    const audioUrl = audioQueueRef.current.shift()
    if (!audioUrl || !audioRef.current) return

    isPlayingRef.current = true
    audioRef.current.src = audioUrl
    audioRef.current.play().catch(error => {
      console.warn('Audio playback failed:', error)
      isPlayingRef.current = false
      processAudioQueue() // Continue with next in queue
    })
  }

  // Handle audio playback completion
  const handleAudioEnd = () => {
    isPlayingRef.current = false
    processAudioQueue() // Play next audio in queue
  }

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      // If muting, stop current audio and clear queue
      audioQueueRef.current = []
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      isPlayingRef.current = false
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className={clsx(
          'p-2 rounded-lg transition-all duration-200',
          'border border-border hover:border-border/80',
          isMuted 
            ? 'bg-red/10 text-red' 
            : 'bg-surface text-text hover:bg-surface/80'
        )}
        title={isMuted ? 'Unmute agent voices' : 'Mute agent voices'}
      >
        <span className="text-sm">
          {isMuted ? '🔇' : '🔊'}
        </span>
      </button>

      {isLoading && (
        <span className="text-xs text-subtle animate-pulse flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber animate-bounce" />
          Generating voice...
        </span>
      )}

      {isPlayingRef.current && !isMuted && (
        <span className="text-xs text-amber flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          Agent speaking
        </span>
      )}

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onError={() => {
          isPlayingRef.current = false
          processAudioQueue()
        }}
        style={{ display: 'none' }}
      />
    </div>
  )
}