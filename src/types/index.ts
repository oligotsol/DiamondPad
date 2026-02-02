/**
 * DiamondPad Core Types
 */

// ============ Launch Types ============

export interface Launch {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image?: string;
  
  // Supply
  totalSupply: number;
  circulatingSupply: number;
  
  // Allocations (percentages)
  devAllocation: number;
  liquidityAllocation: number;
  holderRewardsAllocation: number;
  publicSaleAllocation: number;
  
  // Safety settings
  devVestingMonths: number;
  liquidityLockMonths: number;
  maxWalletPercent: number;
  
  // Status
  status: LaunchStatus;
  createdAt: Date;
  launchAt?: Date;
  graduatedAt?: Date;
  
  // Creator
  creator: string;  // wallet address
  creatorType: 'human' | 'agent';
  agentId?: string;
  
  // Metrics
  raised: number;
  holders: number;
  volume24h: number;
  priceChange24h: number;
}

export type LaunchStatus = 
  | 'pending'      // Created but not live
  | 'active'       // Currently accepting buys
  | 'graduated'    // Hit bonding curve target, LP created
  | 'failed'       // Didn't reach minimum
  | 'rugged';      // Detected malicious activity

// ============ Holder Types ============

export interface Holder {
  wallet: string;
  launchId: string;
  
  // Position
  balance: number;
  costBasis: number;
  
  // Diamond status
  firstBuyAt: Date;
  lastActivityAt: Date;
  holdDurationDays: number;
  
  // Rewards
  diamondMultiplier: number;
  rewardsAccrued: number;
  rewardsClaimed: number;
  
  // Rank
  diamondRank: DiamondRank;
  globalHolderScore: number;
}

export type DiamondRank = 
  | 'Paper'      // < 7 days
  | 'Bronze'     // 7-30 days
  | 'Silver'     // 30-60 days
  | 'Gold'       // 60-90 days
  | 'Platinum'   // 90-180 days
  | 'Diamond';   // 180+ days

export interface HolderRewards {
  wallet: string;
  launchId: string;
  
  // Breakdown
  baseRewards: number;
  diamondBonus: number;
  loyaltyBonus: number;
  totalRewards: number;
  
  // Multipliers applied
  holdMultiplier: number;
  loyaltyMultiplier: number;
  
  // Status
  claimable: boolean;
  nextClaimAt?: Date;
}

// ============ Bundle Detection Types ============

export interface BundleAnalysis {
  transactionSignature: string;
  launchId: string;
  
  // Detection results
  isBundled: boolean;
  confidence: number;  // 0-100
  
  // Evidence
  flags: BundleFlag[];
  relatedWallets: string[];
  fundingSource?: string;
  
  // Action taken
  action: BundleAction;
  penaltyApplied?: BundlePenalty;
}

export interface BundleFlag {
  type: BundleFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence?: any;
}

export type BundleFlagType =
  | 'same_funding_source'     // Wallets funded from same address
  | 'same_block_buys'         // Multiple buys in same block
  | 'similar_amounts'         // Suspiciously similar buy amounts
  | 'new_wallet_cluster'      // Cluster of brand new wallets
  | 'timing_pattern'          // Buys at regular intervals
  | 'known_bundler'           // Wallet associated with known bundler
  | 'wash_trading';           // Circular trading pattern

export type BundleAction =
  | 'none'           // No action, legitimate
  | 'flag'           // Flagged for review
  | 'delay_rewards'  // Rewards delayed 30 days
  | 'reduce_rewards' // Rewards reduced 50%
  | 'block';         // Blocked from participation

export interface BundlePenalty {
  action: BundleAction;
  rewardDelayDays?: number;
  rewardReductionPercent?: number;
  reason: string;
}

// ============ Vesting Types ============

export interface VestingSchedule {
  wallet: string;
  launchId: string;
  
  totalAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  
  startDate: Date;
  endDate: Date;
  cliffDate?: Date;
  
  vestingType: 'linear' | 'cliff' | 'milestone';
  releaseFrequency: 'daily' | 'weekly' | 'monthly';
  
  nextReleaseDate: Date;
  nextReleaseAmount: number;
}

// ============ API Types ============

export interface CreateLaunchRequest {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  
  totalSupply: number;
  devAllocation: number;        // Max 10%
  devVestingMonths: number;     // Min 6
  liquidityLockMonths: number;  // Min 12
  holderRewardsPool: number;    // Recommended 5-15%
  
  // Optional
  launchAt?: Date;
  maxWalletPercent?: number;    // Default 2%
}

export interface BuyRequest {
  launchId: string;
  amount: number;  // in SOL
  slippage?: number;
}

export interface ClaimRequest {
  launchId: string;
}

// ============ Config ============

export const DIAMOND_CONFIG = {
  // Multipliers by hold duration
  MULTIPLIERS: {
    PAPER: { maxDays: 7, multiplier: 1.0 },
    BRONZE: { maxDays: 30, multiplier: 1.5 },
    SILVER: { maxDays: 60, multiplier: 2.0 },
    GOLD: { maxDays: 90, multiplier: 2.5 },
    PLATINUM: { maxDays: 180, multiplier: 3.0 },
    DIAMOND: { maxDays: Infinity, multiplier: 3.5 }
  },
  
  // Launch constraints
  MAX_DEV_ALLOCATION: 10,        // 10%
  MIN_DEV_VESTING_MONTHS: 6,
  MIN_LIQUIDITY_LOCK_MONTHS: 12,
  DEFAULT_MAX_WALLET: 2,         // 2%
  
  // Bundle detection thresholds
  BUNDLE_CONFIDENCE_THRESHOLD: 70,  // Flag if > 70% confidence
  SAME_BLOCK_THRESHOLD: 3,          // 3+ buys in same block = suspicious
  FUNDING_LOOKBACK_HOURS: 24,       // Check funding in last 24h
  
  // Rewards
  REWARDS_CLAIM_COOLDOWN_DAYS: 7,
  BUNDLER_REWARD_DELAY_DAYS: 30,
  BUNDLER_REWARD_REDUCTION: 0.5     // 50% reduction
} as const;
