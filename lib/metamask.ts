'use client'
/**
 * MetaMask Smart Accounts Kit helpers
 * Wraps: createMetaMaskSmartAccount, createDelegation, createRedelegation,
 *        redeemDelegation, requestPermissions (ERC-7715)
 */

'use client'
/**
 * MetaMask Smart Accounts Kit helpers - Demo Implementation
 * 
 * This is a working demo implementation for hackathon purposes.
 * Shows the intended integration with MetaMask Smart Accounts Kit APIs.
 */

import { createPublicClient, http, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'

// ─── Chain config ─────────────────────────────────────────────────────────────
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://sepolia.base.org'
const USDC_ADDR = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as Address

export const publicClient = createPublicClient({ 
  chain: baseSepolia,
  transport: http(RPC_URL) 
})

// ─── Smart account creation ───────────────────────────────────────────────────
/**
 * Connect to MetaMask and get the user's address
 * In production, this would upgrade to a Smart Account via EIP-7702
 */
export async function getOrCreateSmartAccount(provider: any): Promise<Address> {
  try {
    // Request accounts from MetaMask
    const addresses = await provider.request({ method: 'eth_requestAccounts' })
    const userAddress = addresses[0] as Address
    
    console.log(`✅ Connected to MetaMask: ${userAddress}`)
    console.log('🔮 Demo: In production, this would upgrade to Smart Account via EIP-7702')
    
    return userAddress
  } catch (error) {
    throw new Error(`Failed to connect to MetaMask: ${error}`)
  }
}

// ─── ERC-7715: Request rebalance permission ───────────────────────────────────
export interface PermissionResult {
  permissionId: string
  delegation: unknown
  grantee: Address
  expiresAt: number
}

/**
 * Request ERC-7715 Advanced Permission for rebalancing
 */
export async function requestRebalancePermission(
  provider: any,
  grantee: Address,
  maxUSDC = 200
): Promise<PermissionResult> {
  const ONE_WEEK = 7 * 24 * 60 * 60
  
  console.log(`🔐 Demo: Requesting ERC-7715 permission for ${grantee}`)
  console.log(`💰 Max spend: ${maxUSDC} USDC over 1 week`)
  console.log('🔮 Demo: In production, this would use MetaMask\'s ERC-7715 requestPermissions API')
  
  const permissionId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  return {
    permissionId,
    delegation: {
      type: 'advanced-permission-erc7715',
      grantee,
      maxUSDC,
      token: USDC_ADDR,
      period: ONE_WEEK,
      timestamp: Date.now(),
    },
    grantee,
    expiresAt: Math.floor(Date.now() / 1000) + ONE_WEEK,
  }
}

// ─── ERC-7710: Create root delegation ─────────────────────────────────────────
/**
 * Create ERC-7710 root delegation from Smart Account to OracleAgent
 */
export async function createRootDelegation(
  provider: any,
  delegatorAddress: Address,
  oracleAgentAddress: Address
): Promise<unknown> {
  console.log(`🤝 Demo: Creating ERC-7710 root delegation`)
  console.log(`   From: ${delegatorAddress} (Smart Account)`)
  console.log(`   To: ${oracleAgentAddress} (OracleAgent)`)
  console.log('🔮 Demo: In production, this would use createDelegation from MetaMask Smart Accounts Kit')
  
  return {
    type: 'erc7710-root-delegation',
    delegate: oracleAgentAddress,
    delegator: delegatorAddress,
    authority: '0x0000000000000000000000000000000000000000000000000000000000000000', // ROOT_AUTHORITY
    caveats: [
      {
        enforcer: 'ERC20TransferAmountEnforcer',
        terms: {
          token: USDC_ADDR,
          maxAmount: '200000000', // 200 USDC with 6 decimals
        },
      },
      {
        enforcer: 'TimestampEnforcer',
        terms: {
          notAfter: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
        },
      },
    ],
    salt: '0x0000000000000000000000000000000000000000000000000000000000000000',
    signature: '0x',
    timestamp: Date.now(),
  }
}

// ─── ERC-7710: Redelegate (Agent → Agent) ─────────────────────────────────────
/**
 * Create ERC-7710 redelegation from one agent to another
 */
export async function redelegateToAgent(
  parentDelegation: any,
  newDelegate: Address,
  additionalCaveats?: any[]
): Promise<unknown> {
  console.log(`🔄 Demo: Creating ERC-7710 redelegation to ${newDelegate}`)
  console.log('🔮 Demo: In production, this would use createDelegation with parentDelegation')
  
  return {
    type: 'erc7710-redelegation',
    parentDelegation,
    delegate: newDelegate,
    delegator: parentDelegation.delegator,
    authority: parentDelegation.signature || '0x1234567890abcdef', // Parent delegation hash
    caveats: [
      ...parentDelegation.caveats,
      ...(additionalCaveats || []),
      {
        enforcer: 'LimitedCallsEnforcer',
        terms: { limit: 10 }, // Limit redelegated authority
      },
    ],
    salt: '0x0000000000000000000000000000000000000000000000000000000000000001',
    signature: '0x',
    timestamp: Date.now(),
  }
}

// ─── ERC-7710: Build redeem calldata ──────────────────────────────────────────
export interface RedeemParams {
  delegation: unknown
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>
}

/**
 * Build calldata for redeeming ERC-7710 delegations
 */
export async function buildRedeemCalldata(params: RedeemParams): Promise<`0x${string}`> {
  console.log('⚡ Demo: Building ERC-7710 redemption calldata')
  console.log(`   ${params.calls.length} calls to execute`)
  console.log('🔮 Demo: In production, this would use redeemDelegations with DelegationManager contract')
  
  // Simulate building proper redemption calldata
  const callsData = params.calls.map((call) => 
    call.to.slice(2) + call.data.slice(2) + call.value.toString(16).padStart(64, '0')
  ).join('')
  
  // Mock redemption function selector + encoded calls
  const mockCalldata = `0x12345678${callsData.slice(0, 200)}` // Redemption selector + truncated data
  return mockCalldata as `0x${string}`
}

