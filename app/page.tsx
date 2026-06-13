'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { clsx } from 'clsx'
import { getOrCreateSmartAccount } from '@/lib/metamask'

declare global {
  interface Window { ethereum?: Record<string, unknown> & { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }
}

export default function LandingPage() {
  const router   = useRouter()
  const [step, setStep]       = useState<'idle' | 'connecting' | 'upgrading' | 'done' | 'error'>('idle')
  const [smartAcct, setSmartAcct] = useState('')
  const [error, setError]     = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Check if already connected but don't auto-redirect
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioai_smart_account')
      if (saved) {
        setIsConnected(true)
        setSmartAcct(saved)
        setStep('done')
      }
    }
  }, [])

  async function handleConnect() {
    if (!window.ethereum) {
      setError('MetaMask not detected — please install the MetaMask extension.')
      return
    }
    setStep('connecting')
    setError('')
    try {
      // 1. Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const eoa = accounts[0]

      // 2. Upgrade EOA → Smart Account via EIP-7702 + 1Shot
      setStep('upgrading')
      const sa = await getOrCreateSmartAccount(window.ethereum)
      setSmartAcct(sa)

      // Persist for dashboard
      localStorage.setItem('portfolioai_smart_account', sa)
      localStorage.setItem('portfolioai_eoa', eoa)

      // Save to server store
      await fetch('/api/state', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smartAccountAddress: sa }),
      })

      setStep('done')
      setIsConnected(true)
      // Don't auto-redirect, let user choose when to go to dashboard
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
      setStep('error')
    }
  }

  async function handleDisconnect() {
    try {
      // Clear localStorage
      localStorage.removeItem('portfolioai_smart_account')
      localStorage.removeItem('portfolioai_eoa')
      
      // Reset state
      setIsConnected(false)
      setSmartAcct('')
      setStep('idle')
      setError('')
      
      // Clear server store
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smartAccountAddress: null }),
      })
      
      console.log('Wallet disconnected')
    } catch (e) {
      console.error('Error disconnecting:', e)
    }
  }

  function goToDashboard() {
    router.push('/dashboard')
  }

  const FEATURES = [
    { icon: '🔐', title: 'One-time Permission', desc: 'ERC-7715 Advanced Permission — approve once, agents run forever.' },
    { icon: '🤖', title: 'A2A Delegation Chain', desc: 'OracleAgent → StrategyAgent → ExecutorAgent via ERC-7710 redelegation.' },
    { icon: '🧠', title: 'Venice AI Reasoning', desc: 'Live market analysis, rebalance decisions, and portfolio chart generation.' },
    { icon: '⚡', title: 'Gasless Execution', desc: '1Shot Permissionless Relayer pays gas in USDC — no ETH needed.' },
  ]

  return (
    <main className="min-h-screen grid-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-border/50">
        <Image 
          src="/portfolioai_logo.PNG" 
          alt="PortfolioAI" 
          width={120}
          height={32}
          className="h-8 w-auto"
        />
        <span className="text-xs font-mono text-subtle">Base Sepolia · MetaMask Smart Accounts</span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mb-6 w-16 h-16 rounded-2xl bg-amber/10 border border-amber/20 flex items-center justify-center shadow-amber-glow overflow-hidden">
          <Image 
            src="/portfolioai_icon.PNG" 
            alt="PortfolioAI Icon" 
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
          />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-bold text-text mb-4 leading-tight max-w-2xl">
          Autonomous DeFi<br />
          <span className="text-amber text-amber-glow">Portfolio Rebalancing</span>
        </h1>

        <p className="text-subtle text-lg max-w-xl mb-10 leading-relaxed">
          Connect MetaMask once. A swarm of AI agents monitors your portfolio, reasons about market
          conditions with Venice AI, and rebalances automatically — no popups ever again.
        </p>

        {/* Connect/Disconnect button */}
        <div className="flex flex-col items-center gap-3">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={['connecting', 'upgrading'].includes(step)}
              className={clsx(
                'px-8 py-3.5 rounded-2xl text-base font-medium transition-all duration-200',
                'bg-amber text-bg hover:bg-amber/90 active:scale-95',
                'shadow-amber-glow disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {step === 'idle'       && '🦊  Connect MetaMask'}
              {step === 'connecting' && '⟳  Requesting accounts…'}
              {step === 'upgrading'  && '⟳  Upgrading to Smart Account…'}
              {step === 'error'      && '↺  Try Again'}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-3">
                <button
                  onClick={goToDashboard}
                  className="px-6 py-3 rounded-xl text-base font-medium bg-amber text-bg hover:bg-amber/90 active:scale-95 transition-all shadow-amber-glow"
                >
                  📊 Open Dashboard
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-3 rounded-xl text-sm font-medium bg-red/10 text-red border border-red/30 hover:bg-red/20 active:scale-95 transition-all"
                >
                  🔌 Disconnect
                </button>
              </div>
              
              {smartAcct && (
                <p className="text-xs font-mono text-green animate-fade-in">
                  Smart account: {smartAcct.slice(0, 10)}…{smartAcct.slice(-8)}
                </p>
              )}
            </div>
          )}

          {step === 'upgrading' && (
            <p className="text-xs font-mono text-subtle animate-fade-in">
              EIP-7702 upgrade via 1Shot Relayer
            </p>
          )}

          {error && (
            <p className="text-sm text-red bg-red/10 border border-red/20 rounded-xl px-4 py-2 max-w-sm">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px border-t border-border bg-border">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-surface px-6 py-8 flex flex-col gap-3">
            <span className="text-2xl">{f.icon}</span>
            <h3 className="font-display font-semibold text-text text-sm">{f.title}</h3>
            <p className="text-subtle text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}