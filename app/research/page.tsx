'use client'

import { ResearchPaywall } from '@/components/ResearchPaywall'

const TOKENS = ['ETH', 'BTC', 'OP', 'ARB', 'USDC']

export default function ResearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-amber-400 mb-2">
            Research Center
          </h1>
          <p className="text-gray-400">
            Access premium token analysis and market insights
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TOKENS.map((token) => (
            <ResearchPaywall key={token} token={token} currentPrice={2500} />
          ))}
        </div>
      </div>
    </div>
  )
}