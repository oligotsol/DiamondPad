/**
 * Diamond Rewards Calculator
 * 
 * Calculates rewards based on hold duration and loyalty.
 * The longer you hold, the more you earn. True believers win.
 */

import { 
  Holder, 
  HolderRewards, 
  DiamondRank,
  DIAMOND_CONFIG 
} from '../types';

interface RewardPool {
  launchId: string;
  totalPool: number;      // Total tokens allocated for rewards
  distributed: number;    // Already distributed
  remaining: number;      // Available for distribution
  lastDistributionAt: Date;
}

export class DiamondRewardsCalculator {
  private rewardPools: Map<string, RewardPool> = new Map();

  /**
   * Calculate diamond rank based on hold duration
   */
  getDiamondRank(holdDays: number): DiamondRank {
    const { MULTIPLIERS } = DIAMOND_CONFIG;
    
    if (holdDays >= MULTIPLIERS.DIAMOND.maxDays) return 'Diamond';
    if (holdDays >= MULTIPLIERS.PLATINUM.maxDays) return 'Platinum';
    if (holdDays >= MULTIPLIERS.GOLD.maxDays) return 'Gold';
    if (holdDays >= MULTIPLIERS.SILVER.maxDays) return 'Silver';
    if (holdDays >= MULTIPLIERS.BRONZE.maxDays) return 'Bronze';
    return 'Paper';
  }

  /**
   * Get multiplier for a given hold duration
   */
  getMultiplier(holdDays: number): number {
    const { MULTIPLIERS } = DIAMOND_CONFIG;
    
    if (holdDays >= 180) return MULTIPLIERS.DIAMOND.multiplier;
    if (holdDays >= 90) return MULTIPLIERS.PLATINUM.multiplier;
    if (holdDays >= 60) return MULTIPLIERS.GOLD.multiplier;
    if (holdDays >= 30) return MULTIPLIERS.SILVER.multiplier;
    if (holdDays >= 7) return MULTIPLIERS.BRONZE.multiplier;
    return MULTIPLIERS.PAPER.multiplier;
  }

  /**
   * Calculate rewards for a holder
   */
  calculateRewards(holder: Holder, rewardPool: RewardPool): HolderRewards {
    // Base share based on token balance
    // (In real implementation, this would factor in total supply and other holders)
    const baseShare = holder.balance / 1_000_000_000; // Assuming 1B supply
    const baseRewards = baseShare * rewardPool.remaining * 0.01; // 1% of pool per distribution
    
    // Diamond multiplier
    const holdMultiplier = this.getMultiplier(holder.holdDurationDays);
    const diamondBonus = baseRewards * (holdMultiplier - 1);
    
    // Loyalty multiplier (based on global holder score)
    // Higher score = participated in more launches successfully
    const loyaltyMultiplier = 1 + (holder.globalHolderScore * 0.1); // +10% per point
    const loyaltyBonus = (baseRewards + diamondBonus) * (loyaltyMultiplier - 1);
    
    // Total rewards
    const totalRewards = baseRewards + diamondBonus + loyaltyBonus;
    
    // Check if claimable (cooldown period)
    const daysSinceLastClaim = holder.rewardsClaimed > 0 
      ? (Date.now() - holder.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;
    
    const claimable = daysSinceLastClaim >= DIAMOND_CONFIG.REWARDS_CLAIM_COOLDOWN_DAYS;
    const nextClaimAt = claimable 
      ? undefined 
      : new Date(holder.lastActivityAt.getTime() + DIAMOND_CONFIG.REWARDS_CLAIM_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    return {
      wallet: holder.wallet,
      launchId: holder.launchId,
      baseRewards,
      diamondBonus,
      loyaltyBonus,
      totalRewards,
      holdMultiplier,
      loyaltyMultiplier,
      claimable,
      nextClaimAt
    };
  }

  /**
   * Calculate projected rewards over time
   */
  projectRewards(
    currentBalance: number,
    currentHoldDays: number,
    projectionDays: number
  ): {
    day: number;
    rank: DiamondRank;
    multiplier: number;
    estimatedRewards: number;
  }[] {
    const projections: {
      day: number;
      rank: DiamondRank;
      multiplier: number;
      estimatedRewards: number;
    }[] = [];

    // Milestones to show
    const milestones = [7, 30, 60, 90, 180, 365];
    const baseRewardRate = 0.01; // 1% daily (example)

    for (const milestone of milestones) {
      if (milestone <= projectionDays) {
        const totalDays = currentHoldDays + milestone;
        const rank = this.getDiamondRank(totalDays);
        const multiplier = this.getMultiplier(totalDays);
        
        // Compound rewards over time
        const baseRewards = currentBalance * baseRewardRate * milestone;
        const estimatedRewards = baseRewards * multiplier;
        
        projections.push({
          day: milestone,
          rank,
          multiplier,
          estimatedRewards
        });
      }
    }

    return projections;
  }

  /**
   * Calculate global holder score
   * Based on participation and diamond-hand behavior across all launches
   */
  calculateGlobalScore(holderHistory: {
    launchId: string;
    holdDays: number;
    profitLoss: number;
    wasRugged: boolean;
    heldThroughDip: boolean;
  }[]): number {
    let score = 0;

    for (const launch of holderHistory) {
      // Points for hold duration
      if (launch.holdDays >= 180) score += 5;
      else if (launch.holdDays >= 90) score += 3;
      else if (launch.holdDays >= 30) score += 1;
      
      // Bonus for holding through dips
      if (launch.heldThroughDip) score += 2;
      
      // Penalty for quick flips (selling within 24h of profit)
      if (launch.holdDays < 1 && launch.profitLoss > 0) score -= 1;
      
      // Sympathy points for rug victims who held
      if (launch.wasRugged && launch.holdDays >= 7) score += 1;
    }

    return Math.max(0, score); // No negative scores
  }

  /**
   * Generate leaderboard of diamond hands
   */
  generateLeaderboard(
    holders: Holder[],
    launchId?: string
  ): {
    rank: number;
    wallet: string;
    diamondRank: DiamondRank;
    holdDays: number;
    multiplier: number;
    score: number;
  }[] {
    let filtered = holders;
    
    if (launchId) {
      filtered = holders.filter(h => h.launchId === launchId);
    }

    // Sort by hold duration * balance (weighted diamond score)
    const sorted = filtered.sort((a, b) => {
      const scoreA = a.holdDurationDays * this.getMultiplier(a.holdDurationDays) * Math.log10(a.balance + 1);
      const scoreB = b.holdDurationDays * this.getMultiplier(b.holdDurationDays) * Math.log10(b.balance + 1);
      return scoreB - scoreA;
    });

    return sorted.slice(0, 100).map((holder, index) => ({
      rank: index + 1,
      wallet: holder.wallet,
      diamondRank: holder.diamondRank,
      holdDays: holder.holdDurationDays,
      multiplier: holder.diamondMultiplier,
      score: holder.globalHolderScore
    }));
  }

  /**
   * Calculate believer airdrop eligibility
   * Past diamond hands get priority access to new launches
   */
  calculateAirdropEligibility(
    wallet: string,
    globalScore: number,
    pastLaunches: number,
    avgHoldDays: number
  ): {
    eligible: boolean;
    tier: 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
    allocationMultiplier: number;
    priorityAccess: boolean;
  } {
    // Minimum requirements
    if (pastLaunches < 1 || avgHoldDays < 7) {
      return {
        eligible: false,
        tier: 'none',
        allocationMultiplier: 1,
        priorityAccess: false
      };
    }

    // Tier based on global score
    let tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    let allocationMultiplier: number;
    
    if (globalScore >= 20) {
      tier = 'diamond';
      allocationMultiplier = 3.0;
    } else if (globalScore >= 10) {
      tier = 'gold';
      allocationMultiplier = 2.0;
    } else if (globalScore >= 5) {
      tier = 'silver';
      allocationMultiplier = 1.5;
    } else {
      tier = 'bronze';
      allocationMultiplier = 1.2;
    }

    // Priority access for gold+ tiers
    const priorityAccess = tier === 'gold' || tier === 'diamond';

    return {
      eligible: true,
      tier,
      allocationMultiplier,
      priorityAccess
    };
  }
}

export const diamondCalculator = new DiamondRewardsCalculator();
