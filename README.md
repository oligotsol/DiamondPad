# DiamondPad 💎

**The launchpad that rewards believers, not flippers.**

Built by [Kiki](https://colosseum.com/agent-hackathon) for the Colosseum Agent Hackathon.

## The Problem

Current launchpads are broken:

| Problem | What Happens | Who Wins |
|---------|--------------|----------|
| **Bundling** | Devs buy with 50 wallets at launch | Scammers |
| **Multi-walleting** | Sybils farm airdrops/rewards | Farmers |
| **Traders > Holders** | Quick flips = profit, holding = bags | Flippers |
| **Dev Rugs** | No vesting, no accountability | Devs who exit |

**The people who BELIEVE get punished. The extractors get rewarded.**

## The Solution

DiamondPad flips the incentives:

### 1. Hold-to-Earn 💎
Rewards accrue based on **time held**, not just amount. The longer you hold, the more you earn.

```
Day 1-7:    1.0x rewards
Day 8-30:   1.5x rewards  
Day 31-90:  2.5x rewards
Day 90+:    3.5x rewards (Diamond status)
```

### 2. Anti-Bundle Detection 🔍
On-chain analysis detects coordinated buying:
- Wallets funded from same source
- Buys within same block/transaction
- Similar amounts, similar timing

Detected bundlers get **delayed rewards** (30-day cliff) or **reduced allocation**.

### 3. Diamond Multiplier 🏆
True believers earn more:
- Holder score based on hold duration across ALL DiamondPad launches
- Higher score = priority access to new launches
- Diamond hands from past launches = bonus allocation

### 4. Transparent Dev Locks 🔒
- Dev allocation vests over 6-12 months
- Vesting schedule visible on-chain
- Any unlock triggers community notification
- Reputation system tracks dev behavior across launches

### 5. Believer Airdrops 🎁
- Future launches reward proven holders
- Held through a dip? You get priority
- Community loyalty compounds over time

## Agent Integration 🤖

AI agents can launch tokens through DiamondPad:
- Agents provide: name, symbol, description, tokenomics
- DiamondPad enforces safety rails automatically
- Agents build reputation through successful launches
- Bad actors (agent or human) get flagged

## How It Works

### For Launchers

```typescript
import { DiamondPad } from 'diamondpad';

const pad = new DiamondPad({ wallet: myWallet });

// Launch a token
const launch = await pad.createLaunch({
  name: "MyToken",
  symbol: "MTK",
  description: "A token for believers",
  totalSupply: 1_000_000_000,
  
  // DiamondPad enforced settings
  devAllocation: 5,           // Max 10% for devs
  devVestingMonths: 6,        // Minimum 6 month vest
  liquidityLock: 12,          // Minimum 12 month LP lock
  
  // Optional: holder rewards pool
  holderRewardsPool: 10,      // 10% of supply for diamond hands
});
```

### For Buyers

```typescript
// Buy into a launch
const position = await pad.buy({
  launchId: "abc123",
  amount: 1.5,  // SOL
});

// Check your diamond status
const status = await pad.getHolderStatus(position.id);
console.log(status);
// {
//   holdDuration: 45,  // days
//   multiplier: 2.5,
//   rewardsAccrued: 1250,
//   diamondRank: "Gold"
// }
```

## API Endpoints

```
POST /api/launch          — Create a new token launch
GET  /api/launch/:id      — Get launch details
POST /api/buy             — Buy into a launch
GET  /api/holder/:wallet  — Get holder status and rewards
GET  /api/leaderboard     — Top diamond hands
POST /api/claim           — Claim accrued rewards
GET  /api/detect/:tx      — Check if transaction is bundled
```

## Tech Stack

- **Smart Contracts**: Anchor (Solana)
- **Token Standard**: SPL Token + Token-2022
- **API**: Hono + TypeScript
- **Detection**: Custom on-chain analysis
- **Frontend**: React (coming soon)

## Solana Integration

- **Token Creation**: SPL Token mint with enforced authorities
- **Vesting**: Custom vesting program with PDA-based schedules
- **Liquidity**: Raydium/Meteora pool creation with locked LP tokens
- **Rewards**: Merkle distributor for holder rewards
- **Detection**: Helius webhooks + custom indexer

## Roadmap

- [x] Core concept and tokenomics design
- [ ] Anti-bundle detection algorithm
- [ ] Holder rewards smart contract
- [ ] Token launch flow
- [ ] API server
- [ ] Demo launch
- [ ] Frontend

## Why This Wins

This isn't another DeFi dashboard. It's **fixing broken incentives**.

Every person who's been:
- Dumped on by bundlers
- Rugged by devs
- Punished for believing

...is a potential user.

**DiamondPad: Where belief beats extraction.** 💎🙌

---

*Built with 💎 by Kiki for the Colosseum Agent Hackathon*
