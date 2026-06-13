import { NextResponse } from 'next/server'
import { fetchWithX402 } from '@/lib/x402'
import { summariseMarket, veniceGenerateChart } from '@/lib/venice'
import { addEvent, store } from '@/lib/store'
import { createPublicClient, http, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'

const TARGETS: Record<string, number> = JSON.parse(
  process.env.PORTFOLIO_TARGETS ?? '{"ETH":60,"USDC":40}'
)

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Token addresses on Base Sepolia
const TOKEN_ADDRESSES = {
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  ETH: '0x4200000000000000000000000000000000000006' as `0x${string}`, // WETH on Base
}

// Create viem client for on-chain queries
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
})

// Fetch real prices from CoinGecko API
async function fetchRealPrices(): Promise<Record<string, number>> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,bitcoin,optimism,arbitrum&vs_currencies=usd&include_24hr_change=true',
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  
  return {
    ETH: data.ethereum?.usd ?? 0,
    USDC: data['usd-coin']?.usd ?? 0,
    BTC: data.bitcoin?.usd ?? 0,
    OP: data.optimism?.usd ?? 0,
    ARB: data.arbitrum?.usd ?? 0,
  }
}

// Fetch real on-chain balances
async function fetchRealBalances(userAddress: `0x${string}`): Promise<Record<string, number>> {
  const balances: Record<string, number> = {}

  // Fetch ETH balance (native token)
  const ethBalance = await publicClient.getBalance({ address: userAddress })
  balances.ETH = parseFloat(formatUnits(ethBalance, 18))

  // Fetch USDC balance (ERC20)
  const usdcBalance = await publicClient.readContract({
    address: TOKEN_ADDRESSES.USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  })
  balances.USDC = parseFloat(formatUnits(usdcBalance, 6))

  return balances
}

/**
 * GET /api/agent/oracle
 *
 * Step 1 of the agent pipeline.
 * - Fetches live token prices from CoinGecko API (real-time)
 * - Reads on-chain balances using viem for Base Sepolia (real-time)
 * - Calls Venice AI to summarise market conditions
 * - Optionally generates a Venice chart image
 * - Updates the shared store so the dashboard can poll
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const withChart = searchParams.get('chart') === 'true'

  addEvent({ agent: 'oracle', status: 'running', message: 'Fetching real market prices and portfolio balances…' })

  try {
    // ── 1. Real CoinGecko Prices (no fallback to mock) ──────────────────────
    addEvent({ agent: 'oracle', status: 'running', message: 'Fetching live market prices from CoinGecko API…' })
    const prices = await fetchRealPrices()

    // ── 2. Real On-Chain Balances (no fallback to mock) ─────────────────────
    const userAddress = store.wallet?.address as `0x${string}` | undefined

    if (!userAddress) {
      addEvent({
        agent: 'oracle',
        status: 'error',
        message: 'No wallet connected - cannot fetch real portfolio balances',
        detail: 'Real mode requires connected wallet for on-chain balance queries'
      })
      return NextResponse.json({
        error: 'Wallet not connected',
        detail: 'Real mode requires wallet connection for on-chain balance queries'
      }, { status: 400 })
    }

    addEvent({ agent: 'oracle', status: 'running', message: 'Reading live on-chain portfolio balances…' })
    const balances = await fetchRealBalances(userAddress)

    // Compute USD values and allocations
    const values: Record<string, number> = {}
    for (const [token, amount] of Object.entries(balances)) {
      values[token] = amount * (prices[token] ?? 0)
    }
    const totalValueUSDC = Object.values(values).reduce((a, b) => a + b, 0)
    const allocations: Record<string, number> = {}
    for (const [token, val] of Object.entries(values)) {
      allocations[token] = totalValueUSDC > 0 ? (val / totalValueUSDC) * 100 : 0
    }

    // ── 3. Venice AI market summary ──────────────────────────────────────────
    console.log('🧠 Oracle: Calling Venice AI for market summary...')
    const marketSummary = await summariseMarket(prices, values)
    console.log('✅ Oracle: Market summary received:', marketSummary)

    // ── 4. Venice chart image (on demand to save credits during dev) ─────────
    let chartImageUrl: string | undefined
    if (withChart) {
      console.log('🎨 Oracle: Generating Venice AI chart...')
      try {
        chartImageUrl = await veniceGenerateChart(allocations)
        console.log('✅ Oracle: Chart generated successfully')
      } catch (chartError) {
        console.error('❌ Oracle: Chart generation failed:', chartError)
        // Continue without chart rather than failing completely
        chartImageUrl = undefined
      }
    }

    // ── 5. Persist to store ──────────────────────────────────────────────────
    store.portfolio = {
      prices,
      balances,
      allocations,
      totalValueUSDC,
      marketSummary,
      chartImageUrl: chartImageUrl ?? store.portfolio?.chartImageUrl,
      updatedAt: Date.now(),
    }

    addEvent({
      agent:   'oracle',
      status:  'success',
      message: `Portfolio analysis complete: ${totalValueUSDC.toFixed(2)} USDC total (live CoinGecko + on-chain data)`,
      detail:  marketSummary,
      audioText: `Oracle analysis complete. ${marketSummary}` // Audio narration
    })

    return NextResponse.json({
      prices,
      balances,
      allocations,
      totalValueUSDC,
      marketSummary,
      chartImageUrl,
      targets: TARGETS,
      dataSources: {
        prices: 'live CoinGecko API',
        balances: 'on-chain Base Sepolia',
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('❌ Oracle Agent Error:', msg)
    console.error('Full error:', err)
    addEvent({
      agent: 'oracle',
      status: 'error',
      message: 'Oracle Agent failed with real data sources',
      detail: `Error: ${msg}. Check CoinGecko API and RPC connectivity.`
    })
    return NextResponse.json({ error: msg, source: 'real data failure' }, { status: 500 })
  }
}
