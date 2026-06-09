'use client'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'

interface ChatMessage {
  id: string
  type: 'user' | 'agent'
  content: string
  timestamp: number
  status?: 'pending' | 'success' | 'error'
  txHash?: string
}

interface Props {
  smartAccountAddress?: string
  hasPermission: boolean
}

export function AgentChat({ smartAccountAddress, hasPermission }: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<{
    amount: number
    token: string
    recipient: string
  } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id
  }

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message
    addMessage({
      type: 'user',
      content: userMessage
    })

    setIsLoading(true)

    try {
      // Handle confirmation
      if (awaitingConfirmation && userMessage.toUpperCase() === 'CONFIRM') {
        await handleConfirmedTransfer()
        return
      }

      // Parse intent with Venice AI
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          smartAccountAddress 
        })
      })

      const data = await response.json()

      if (!response.ok) {
        addMessage({
          type: 'agent',
          content: `Sorry, I encountered an error: ${data.error}`,
          status: 'error'
        })
        return
      }

      if (!data.valid) {
        addMessage({
          type: 'agent',
          content: "I can help you send USDC transfers. Try something like: 'Send 20 USDC to 0x1234...abcd' or 'Transfer 50 USDC to alice.eth'"
        })
        return
      }

      // Validation checks
      if (!hasPermission) {
        addMessage({
          type: 'agent',
          content: "I need permission to execute transfers. Please grant delegation permission first."
        })
        return
      }

      if (data.token.toUpperCase() !== 'USDC') {
        addMessage({
          type: 'agent',
          content: "I can only send USDC transfers at the moment. Other tokens aren't supported yet."
        })
        return
      }

      // Set up confirmation flow
      setAwaitingConfirmation({
        amount: data.amount,
        token: data.token,
        recipient: data.recipient
      })

      addMessage({
        type: 'agent',
        content: `I'll send ${data.amount} ${data.token} to ${data.recipient}. Type CONFIRM to proceed.`
      })

    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        type: 'agent',
        content: 'Sorry, something went wrong. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmedTransfer = async () => {
    if (!awaitingConfirmation) return

    const agentMessageId = addMessage({
      type: 'agent',
      content: `Executing transfer of ${awaitingConfirmation.amount} ${awaitingConfirmation.token}...`,
      status: 'pending'
    })

    try {
      const response = await fetch('/api/agent/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: awaitingConfirmation.amount,
          token: awaitingConfirmation.token,
          recipient: awaitingConfirmation.recipient,
          smartAccountAddress
        })
      })

      const data = await response.json()

      if (!response.ok) {
        updateMessage(agentMessageId, {
          content: `Transfer failed: ${data.error}`,
          status: 'error'
        })
        return
      }

      updateMessage(agentMessageId, {
        content: `Transfer sent ✓ Job ID: ${data.jobId}`,
        status: 'success',
        txHash: data.jobId
      })

    } catch (error) {
      console.error('Transfer error:', error)
      updateMessage(agentMessageId, {
        content: 'Transfer failed. Please try again.',
        status: 'error'
      })
    } finally {
      setAwaitingConfirmation(null)
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setAwaitingConfirmation(null)
    addMessage({
      type: 'agent',
      content: 'Transfer cancelled.'
    })
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
      <h3 className="text-sm font-display font-semibold text-text flex items-center gap-2">
        💬 Talk to your agent
      </h3>

      {/* Messages */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-xs text-subtle text-center py-4">
            Try: "Send 20 USDC to 0x1234...abcd"
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              'flex gap-2 text-xs',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={clsx(
                'max-w-[80%] px-3 py-2 rounded-lg',
                message.type === 'user'
                  ? 'bg-amber text-bg'
                  : 'bg-border text-text',
                message.status === 'error' && 'bg-red/20 border border-red/30',
                message.status === 'success' && 'bg-green/20 border border-green/30',
                message.status === 'pending' && 'animate-pulse'
              )}
            >
              <p className="leading-relaxed">{message.content}</p>
              {message.txHash && (
                <p className="text-xs opacity-70 mt-1 font-mono">
                  {message.txHash}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Send 20 USDC to 0x1234...abcd"
            className="flex-1 px-3 py-2 text-xs bg-bg border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-amber text-text placeholder-subtle"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-amber text-bg text-xs font-medium rounded-lg hover:bg-amber/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? '⟳' : '→'}
          </button>
        </div>

        {awaitingConfirmation && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-3 py-2 bg-border text-text text-xs font-medium rounded-lg hover:bg-border/80 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setInput('CONFIRM')}
              className="flex-1 px-3 py-2 bg-green text-white text-xs font-medium rounded-lg hover:bg-green/90 transition-all"
            >
              Type CONFIRM
            </button>
          </div>
        )}
      </form>
    </div>
  )
}