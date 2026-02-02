/**
 * DiamondPad Basic Usage Example
 * 
 * This shows how to integrate DiamondPad into your application
 */

import { diamondCalculator } from '../src/rewards/diamond';
import { BundleDetector } from '../src/detector/bundle';
import { DIAMOND_CONFIG } from '../src/types';

// ============ Diamond Rewards Examples ============

console.log('💎 Diamond Rewards Calculator Examples\n');

// 1. Check diamond rank for different hold durations
const holdDurations = [1, 7, 30, 60, 90, 180, 365];

console.log('Hold Duration → Diamond Rank:');
for (const days of holdDurations) {
  const rank = diamondCalculator.getDiamondRank(days);
  const multiplier = diamondCalculator.getMultiplier(days);
  console.log(`  ${days} days → ${rank} (${multiplier}x multiplier)`);
}

// 2. Calculate projected rewards
console.log('\n📈 Projected Rewards (1M tokens, starting from day 0):');
const projections = diamondCalculator.projectRewards(1_000_000, 0, 365);
for (const proj of projections) {
  console.log(`  Day ${proj.day}: ${proj.rank} → ${proj.estimatedRewards.toLocaleString()} tokens`);
}

// 3. Calculate global holder score
console.log('\n🏆 Global Score Calculation:');
const holderHistory = [
  { launchId: 'launch1', holdDays: 45, profitLoss: 500, wasRugged: false, heldThroughDip: true },
  { launchId: 'launch2', holdDays: 90, profitLoss: -100, wasRugged: false, heldThroughDip: true },
  { launchId: 'launch3', holdDays: 15, profitLoss: 200, wasRugged: true, heldThroughDip: true },
];

const globalScore = diamondCalculator.calculateGlobalScore(holderHistory);
console.log(`  History: 3 launches, held through dips`);
console.log(`  Global Score: ${globalScore}`);

// 4. Check airdrop eligibility
console.log('\n🎁 Airdrop Eligibility:');
const eligibility = diamondCalculator.calculateAirdropEligibility(
  'ExampleWallet123',
  globalScore,
  holderHistory.length,
  50 // avg hold days
);
console.log(`  Eligible: ${eligibility.eligible}`);
console.log(`  Tier: ${eligibility.tier}`);
console.log(`  Allocation Multiplier: ${eligibility.allocationMultiplier}x`);
console.log(`  Priority Access: ${eligibility.priorityAccess}`);

// ============ Bundle Detection Examples ============

console.log('\n\n🔍 Bundle Detection Examples\n');

// Show detection thresholds
console.log('Detection Thresholds:');
console.log(`  Same block threshold: ${DIAMOND_CONFIG.SAME_BLOCK_THRESHOLD}+ buys`);
console.log(`  Confidence threshold: ${DIAMOND_CONFIG.BUNDLE_CONFIDENCE_THRESHOLD}%`);
console.log(`  Funding lookback: ${DIAMOND_CONFIG.FUNDING_LOOKBACK_HOURS} hours`);

// Show penalty structure
console.log('\nPenalty Structure:');
console.log('  0-30% confidence  → No action');
console.log('  30-50% confidence → Flag for review');
console.log('  50-70% confidence → Delay rewards 30 days');
console.log('  70-90% confidence → Reduce rewards 50%');
console.log('  90%+ confidence   → Block from participation');

// ============ API Usage Example ============

console.log('\n\n📡 API Usage Example\n');

const exampleApiCalls = `
// Create a launch
const launch = await fetch('https://api.diamondpad.xyz/api/launch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'MyToken',
    symbol: 'MTK',
    description: 'A token for believers',
    totalSupply: 1_000_000_000,
    devAllocation: 5,
    devVestingMonths: 6,
    liquidityLockMonths: 12,
    holderRewardsPool: 10,
    creatorWallet: 'YourWallet...',
    creatorType: 'human'
  })
});

// Check holder status
const holder = await fetch('https://api.diamondpad.xyz/api/holder/WalletAddress');

// Get leaderboard
const leaderboard = await fetch('https://api.diamondpad.xyz/api/leaderboard?limit=10');

// Check if transaction is bundled
const bundleCheck = await fetch(
  'https://api.diamondpad.xyz/api/detect/TxSignature?launchId=launch_123'
);
`;

console.log(exampleApiCalls);

// ============ Configuration ============

console.log('\n⚙️ Platform Configuration\n');
console.log('Safety Limits:');
console.log(`  Max dev allocation: ${DIAMOND_CONFIG.MAX_DEV_ALLOCATION}%`);
console.log(`  Min dev vesting: ${DIAMOND_CONFIG.MIN_DEV_VESTING_MONTHS} months`);
console.log(`  Min LP lock: ${DIAMOND_CONFIG.MIN_LIQUIDITY_LOCK_MONTHS} months`);
console.log(`  Default max wallet: ${DIAMOND_CONFIG.DEFAULT_MAX_WALLET}%`);

console.log('\n💎 Diamond hands win. Paper hands don\'t.\n');
