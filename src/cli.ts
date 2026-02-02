#!/usr/bin/env node
/**
 * DiamondPad CLI
 * 
 * Commands:
 * - demo: Run a demonstration of DiamondPad
 * - detect <tx>: Check if a transaction is bundled
 * - rank <days>: Show diamond rank for hold duration
 * - stats: Show platform statistics
 */

import { BundleDetector } from './detector/bundle';
import { diamondCalculator } from './rewards/diamond';
import { db } from './db/index';
import { DIAMOND_CONFIG } from './types';

const HELP = `
╔═══════════════════════════════════════════════════════════════╗
║                    💎 DiamondPad CLI 💎                        ║
║         The launchpad that rewards believers                  ║
╚═══════════════════════════════════════════════════════════════╝

Commands:
  demo              Run a demonstration of DiamondPad features
  rank <days>       Calculate diamond rank for hold duration
  multiplier <days> Show reward multiplier for hold duration
  project <days>    Project rewards over time
  stats             Show database statistics
  help              Show this help message

Examples:
  npx tsx src/cli.ts demo
  npx tsx src/cli.ts rank 45
  npx tsx src/cli.ts multiplier 90
  npx tsx src/cli.ts project 365
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'demo':
      await runDemo();
      break;
    
    case 'rank':
      const rankDays = parseInt(args[1] || '0');
      showRank(rankDays);
      break;
    
    case 'multiplier':
      const multDays = parseInt(args[1] || '0');
      showMultiplier(multDays);
      break;
    
    case 'project':
      const projDays = parseInt(args[1] || '365');
      projectRewards(projDays);
      break;
    
    case 'stats':
      showStats();
      break;
    
    case 'help':
    default:
      console.log(HELP);
      break;
  }
}

async function runDemo() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   💎 DiamondPad Demo 💎                        ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // 1. Show diamond ranks
  console.log('📊 DIAMOND RANK SYSTEM\n');
  console.log('The longer you hold, the more you earn:\n');
  
  const ranks = [
    { days: 1, emoji: '📄' },
    { days: 7, emoji: '🥉' },
    { days: 30, emoji: '🥈' },
    { days: 60, emoji: '🥇' },
    { days: 90, emoji: '💠' },
    { days: 180, emoji: '💎' },
  ];

  for (const { days, emoji } of ranks) {
    const rank = diamondCalculator.getDiamondRank(days);
    const mult = diamondCalculator.getMultiplier(days);
    console.log(`  ${emoji} ${days.toString().padStart(3)} days → ${rank.padEnd(10)} (${mult}x rewards)`);
  }

  // 2. Show bundle detection
  console.log('\n\n🔍 BUNDLE DETECTION ENGINE\n');
  console.log('We detect coordinated buying through:\n');
  console.log('  1. Same-block buy analysis');
  console.log('  2. Funding source tracing');
  console.log('  3. Wallet age scoring');
  console.log('  4. Timing pattern detection');
  console.log('  5. Similar amount flagging');
  console.log('  6. Known bundler registry');

  console.log('\nActions for detected bundlers:');
  console.log('  • 30-50% confidence → Flag for review');
  console.log('  • 50-70% confidence → Delay rewards 30 days');
  console.log('  • 70-90% confidence → Reduce rewards 50%');
  console.log('  • 90%+ confidence   → Block from participation');

  // 3. Show reward projection
  console.log('\n\n📈 REWARD PROJECTION\n');
  console.log('If you hold 1,000,000 tokens for:\n');
  
  const balance = 1_000_000;
  const baseRate = 0.001; // 0.1% daily
  
  for (const { days } of ranks) {
    const mult = diamondCalculator.getMultiplier(days);
    const baseReward = balance * baseRate * days;
    const boostedReward = baseReward * mult;
    console.log(`  ${days.toString().padStart(3)} days → ${boostedReward.toLocaleString().padStart(12)} tokens (${mult}x boost)`);
  }

  // 4. Show safety settings
  console.log('\n\n🔒 SAFETY SETTINGS\n');
  console.log('All launches on DiamondPad enforce:\n');
  console.log(`  • Max dev allocation: ${DIAMOND_CONFIG.MAX_DEV_ALLOCATION}%`);
  console.log(`  • Min dev vesting:    ${DIAMOND_CONFIG.MIN_DEV_VESTING_MONTHS} months`);
  console.log(`  • Min LP lock:        ${DIAMOND_CONFIG.MIN_LIQUIDITY_LOCK_MONTHS} months`);
  console.log(`  • Default max wallet: ${DIAMOND_CONFIG.DEFAULT_MAX_WALLET}%`);

  console.log('\n\n✅ Demo complete. Diamond hands win. 💎🙌\n');
}

function showRank(days: number) {
  const rank = diamondCalculator.getDiamondRank(days);
  const mult = diamondCalculator.getMultiplier(days);
  
  const emoji = getEmoji(rank);
  
  console.log(`\n${emoji} ${days} days of holding:\n`);
  console.log(`  Rank:       ${rank}`);
  console.log(`  Multiplier: ${mult}x`);
  
  // Show progress to next rank
  const thresholds = [7, 30, 60, 90, 180];
  for (const threshold of thresholds) {
    if (days < threshold) {
      console.log(`\n  → ${threshold - days} more days to reach ${diamondCalculator.getDiamondRank(threshold)}!`);
      break;
    }
  }
  
  if (days >= 180) {
    console.log(`\n  🎉 Maximum rank achieved! True Diamond Hands! 💎`);
  }
  
  console.log('');
}

function showMultiplier(days: number) {
  const mult = diamondCalculator.getMultiplier(days);
  const rank = diamondCalculator.getDiamondRank(days);
  
  console.log(`\n💎 Multiplier for ${days} days:\n`);
  console.log(`  Rank:       ${rank}`);
  console.log(`  Multiplier: ${mult}x`);
  console.log(`\n  This means your rewards are ${mult}x what paper hands get.\n`);
}

function projectRewards(days: number) {
  console.log(`\n📈 Reward Projection for ${days} days of holding:\n`);
  
  const projections = diamondCalculator.projectRewards(1_000_000, 0, days);
  
  console.log('  Assuming 1,000,000 tokens held:\n');
  console.log('  Day    Rank        Multiplier    Est. Rewards');
  console.log('  ────── ────────── ──────────── ─────────────');
  
  for (const proj of projections) {
    console.log(`  ${proj.day.toString().padStart(5)}  ${proj.rank.padEnd(10)} ${proj.multiplier}x          ${proj.estimatedRewards.toLocaleString()}`);
  }
  
  console.log('');
}

function showStats() {
  try {
    const stats = db.getStats();
    
    console.log('\n📊 DiamondPad Statistics:\n');
    console.log(`  Total Launches:     ${stats.totalLaunches}`);
    console.log(`  Active Launches:    ${stats.activeLaunches}`);
    console.log(`  Total Holders:      ${stats.totalHolders}`);
    console.log(`  Diamond Hands:      ${stats.diamondHands} (90+ days)`);
    console.log(`  Bundlers Detected:  ${stats.bundlersDetected}`);
    console.log('');
  } catch (error) {
    console.log('\n⚠️  Database not initialized. Run the server first.\n');
  }
}

function getEmoji(rank: string): string {
  switch (rank) {
    case 'Paper': return '📄';
    case 'Bronze': return '🥉';
    case 'Silver': return '🥈';
    case 'Gold': return '🥇';
    case 'Platinum': return '💠';
    case 'Diamond': return '💎';
    default: return '❓';
  }
}

main().catch(console.error);
