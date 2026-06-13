'use client'

import { AgentChat } from '@/components/AgentChat'

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-amber-400 mb-2">
            Agent Chat
          </h1>
          <p className="text-gray-400">
            Give natural language instructions to your portfolio agent
          </p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <AgentChat hasPermission={true} />
        </div>
      </div>
    </div>
  )
}