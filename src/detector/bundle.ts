/**
 * Bundle Detector - Identifies coordinated buying patterns
 * 
 * This is the core innovation of DiamondPad.
 * We analyze on-chain data to detect bundlers and protect real believers.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { 
  BundleAnalysis, 
  BundleFlag, 
  BundleFlagType, 
  BundleAction,
  BundlePenalty,
  DIAMOND_CONFIG 
} from '../types';

interface WalletHistory {
  address: string;
  fundingSources: string[];
  firstTxTimestamp: number;
  totalTxCount: number;
  recentBuys: BuyRecord[];
}

interface BuyRecord {
  signature: string;
  wallet: string;
  amount: number;
  slot: number;
  timestamp: number;
  launchId: string;
}

export class BundleDetector {
  private connection: Connection;
  private knownBundlers: Set<string>;
  private walletCache: Map<string, WalletHistory>;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl);
    this.knownBundlers = new Set();
    this.walletCache = new Map();
  }

  /**
   * Analyze a transaction for bundle behavior
   */
  async analyzeTransaction(
    signature: string,
    launchId: string,
    recentBuys: BuyRecord[]
  ): Promise<BundleAnalysis> {
    const flags: BundleFlag[] = [];
    const relatedWallets: string[] = [];
    
    // Get transaction details
    const tx = await this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
    
    if (!tx) {
      return this.createAnalysis(signature, launchId, false, 0, [], 'none');
    }

    const buyerWallet = tx.transaction.message.accountKeys[0].pubkey.toString();
    
    // 1. Check if known bundler
    if (this.knownBundlers.has(buyerWallet)) {
      flags.push({
        type: 'known_bundler',
        severity: 'critical',
        description: 'Wallet is associated with known bundling activity'
      });
    }

    // 2. Check for same-block buys
    const sameBlockBuys = recentBuys.filter(b => 
      b.slot === tx.slot && b.wallet !== buyerWallet
    );
    
    if (sameBlockBuys.length >= DIAMOND_CONFIG.SAME_BLOCK_THRESHOLD) {
      flags.push({
        type: 'same_block_buys',
        severity: 'high',
        description: `${sameBlockBuys.length + 1} buys in the same block`,
        evidence: { count: sameBlockBuys.length + 1, slot: tx.slot }
      });
      relatedWallets.push(...sameBlockBuys.map(b => b.wallet));
    }

    // 3. Check funding sources
    const fundingAnalysis = await this.analyzeFundingSources(
      buyerWallet, 
      recentBuys.map(b => b.wallet)
    );
    
    if (fundingAnalysis.sharedSource) {
      flags.push({
        type: 'same_funding_source',
        severity: 'high',
        description: `Funded from same source as ${fundingAnalysis.relatedCount} other buyers`,
        evidence: { source: fundingAnalysis.source, count: fundingAnalysis.relatedCount }
      });
      relatedWallets.push(...fundingAnalysis.relatedWallets);
    }

    // 4. Check for new wallet cluster
    const walletAge = await this.getWalletAge(buyerWallet);
    const newWalletBuyers = await this.countNewWalletBuyers(recentBuys, 24); // 24 hours
    
    if (walletAge < 24 && newWalletBuyers >= 5) {
      flags.push({
        type: 'new_wallet_cluster',
        severity: 'medium',
        description: `New wallet (${walletAge}h old) part of cluster of ${newWalletBuyers} new wallets`,
        evidence: { walletAgeHours: walletAge, clusterSize: newWalletBuyers }
      });
    }

    // 5. Check for similar amounts
    const buyAmount = this.extractBuyAmount(tx);
    const similarAmountBuys = recentBuys.filter(b => 
      Math.abs(b.amount - buyAmount) / buyAmount < 0.05 // Within 5%
    );
    
    if (similarAmountBuys.length >= 3) {
      flags.push({
        type: 'similar_amounts',
        severity: 'medium',
        description: `${similarAmountBuys.length} buys with nearly identical amounts`,
        evidence: { amount: buyAmount, matchCount: similarAmountBuys.length }
      });
    }

    // 6. Check timing patterns
    const timingPattern = this.detectTimingPattern(recentBuys);
    if (timingPattern.detected) {
      flags.push({
        type: 'timing_pattern',
        severity: 'medium',
        description: `Regular timing pattern detected: ~${timingPattern.intervalMs}ms intervals`,
        evidence: timingPattern
      });
    }

    // Calculate confidence score
    const confidence = this.calculateConfidence(flags);
    const isBundled = confidence >= DIAMOND_CONFIG.BUNDLE_CONFIDENCE_THRESHOLD;
    
    // Determine action
    const action = this.determineAction(confidence, flags);
    const penalty = this.determinePenalty(action, flags);

    // Update known bundlers if high confidence
    if (confidence >= 90) {
      this.knownBundlers.add(buyerWallet);
      relatedWallets.forEach(w => this.knownBundlers.add(w));
    }

    return this.createAnalysis(
      signature, 
      launchId, 
      isBundled, 
      confidence, 
      flags, 
      action,
      relatedWallets,
      fundingAnalysis.source,
      penalty
    );
  }

  /**
   * Analyze funding sources for a group of wallets
   */
  private async analyzeFundingSources(
    wallet: string,
    otherBuyers: string[]
  ): Promise<{
    sharedSource: boolean;
    source?: string;
    relatedCount: number;
    relatedWallets: string[];
  }> {
    try {
      // Get recent transactions for the wallet
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(wallet),
        { limit: 20 }
      );

      // Find SOL transfers TO this wallet (funding)
      const fundingSources: string[] = [];
      
      for (const sig of signatures) {
        const tx = await this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx) continue;
        
        // Look for SOL transfers to this wallet
        for (const ix of tx.transaction.message.instructions) {
          if ('parsed' in ix && ix.parsed?.type === 'transfer') {
            if (ix.parsed.info.destination === wallet) {
              fundingSources.push(ix.parsed.info.source);
            }
          }
        }
      }

      // Check if any other buyers share funding sources
      const relatedWallets: string[] = [];
      
      for (const buyer of otherBuyers) {
        const buyerHistory = this.walletCache.get(buyer);
        if (buyerHistory) {
          const shared = buyerHistory.fundingSources.some(s => 
            fundingSources.includes(s)
          );
          if (shared) {
            relatedWallets.push(buyer);
          }
        }
      }

      // Find the most common funding source
      const sourceCount = new Map<string, number>();
      fundingSources.forEach(s => {
        sourceCount.set(s, (sourceCount.get(s) || 0) + 1);
      });
      
      let topSource: string | undefined;
      let topCount = 0;
      sourceCount.forEach((count, source) => {
        if (count > topCount) {
          topCount = count;
          topSource = source;
        }
      });

      return {
        sharedSource: relatedWallets.length > 0,
        source: topSource,
        relatedCount: relatedWallets.length,
        relatedWallets
      };
    } catch (error) {
      console.error('Error analyzing funding sources:', error);
      return { sharedSource: false, relatedCount: 0, relatedWallets: [] };
    }
  }

  /**
   * Get wallet age in hours
   */
  private async getWalletAge(wallet: string): Promise<number> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(wallet),
        { limit: 1 }
      );
      
      if (signatures.length === 0) return 0;
      
      const firstTx = signatures[signatures.length - 1];
      const ageMs = Date.now() - (firstTx.blockTime || 0) * 1000;
      return ageMs / (1000 * 60 * 60); // Convert to hours
    } catch {
      return 0;
    }
  }

  /**
   * Count how many recent buyers have new wallets
   */
  private async countNewWalletBuyers(
    buys: BuyRecord[], 
    maxAgeHours: number
  ): Promise<number> {
    let count = 0;
    
    for (const buy of buys.slice(0, 20)) { // Check last 20
      const age = await this.getWalletAge(buy.wallet);
      if (age < maxAgeHours) count++;
    }
    
    return count;
  }

  /**
   * Extract buy amount from transaction
   */
  private extractBuyAmount(tx: any): number {
    // Look for SOL transfer in the transaction
    try {
      const preBalance = tx.meta?.preBalances?.[0] || 0;
      const postBalance = tx.meta?.postBalances?.[0] || 0;
      return (preBalance - postBalance) / 1e9; // Convert lamports to SOL
    } catch {
      return 0;
    }
  }

  /**
   * Detect regular timing patterns in buys
   */
  private detectTimingPattern(buys: BuyRecord[]): {
    detected: boolean;
    intervalMs?: number;
  } {
    if (buys.length < 5) return { detected: false };

    // Sort by timestamp
    const sorted = [...buys].sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate intervals between consecutive buys
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i].timestamp - sorted[i-1].timestamp);
    }

    // Check if intervals are suspiciously regular
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // If standard deviation is less than 10% of average, it's suspiciously regular
    const isRegular = stdDev < avgInterval * 0.1;
    
    return {
      detected: isRegular && avgInterval < 60000, // Regular intervals under 1 minute
      intervalMs: isRegular ? avgInterval : undefined
    };
  }

  /**
   * Calculate confidence score based on flags
   */
  private calculateConfidence(flags: BundleFlag[]): number {
    if (flags.length === 0) return 0;

    const severityWeights = {
      critical: 40,
      high: 25,
      medium: 15,
      low: 5
    };

    let score = 0;
    for (const flag of flags) {
      score += severityWeights[flag.severity];
    }

    return Math.min(100, score);
  }

  /**
   * Determine action based on confidence and flags
   */
  private determineAction(confidence: number, flags: BundleFlag[]): BundleAction {
    // Critical flags = immediate block
    if (flags.some(f => f.type === 'known_bundler')) {
      return 'block';
    }

    if (confidence >= 90) return 'block';
    if (confidence >= 70) return 'reduce_rewards';
    if (confidence >= 50) return 'delay_rewards';
    if (confidence >= 30) return 'flag';
    return 'none';
  }

  /**
   * Determine penalty details
   */
  private determinePenalty(action: BundleAction, flags: BundleFlag[]): BundlePenalty | undefined {
    switch (action) {
      case 'block':
        return {
          action: 'block',
          reason: 'High confidence bundle detection - participation blocked'
        };
      case 'reduce_rewards':
        return {
          action: 'reduce_rewards',
          rewardReductionPercent: DIAMOND_CONFIG.BUNDLER_REWARD_REDUCTION * 100,
          reason: 'Suspected bundling - rewards reduced by 50%'
        };
      case 'delay_rewards':
        return {
          action: 'delay_rewards',
          rewardDelayDays: DIAMOND_CONFIG.BUNDLER_REWARD_DELAY_DAYS,
          reason: 'Potential bundling detected - rewards delayed 30 days'
        };
      default:
        return undefined;
    }
  }

  /**
   * Create analysis result object
   */
  private createAnalysis(
    signature: string,
    launchId: string,
    isBundled: boolean,
    confidence: number,
    flags: BundleFlag[],
    action: BundleAction,
    relatedWallets: string[] = [],
    fundingSource?: string,
    penalty?: BundlePenalty
  ): BundleAnalysis {
    return {
      transactionSignature: signature,
      launchId,
      isBundled,
      confidence,
      flags,
      relatedWallets: [...new Set(relatedWallets)], // Dedupe
      fundingSource,
      action,
      penaltyApplied: penalty
    };
  }

  /**
   * Manually add a known bundler
   */
  addKnownBundler(wallet: string): void {
    this.knownBundlers.add(wallet);
  }

  /**
   * Get list of known bundlers
   */
  getKnownBundlers(): string[] {
    return Array.from(this.knownBundlers);
  }
}
