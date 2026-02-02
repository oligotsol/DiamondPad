/**
 * DiamondPad Database Layer
 * SQLite for local development, can swap for Turso/Postgres in production
 */

import Database from 'better-sqlite3';
import path from 'path';
import { Launch, Holder, BundleAnalysis, VestingSchedule } from '../types';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'diamondpad.db');

class DiamondPadDB {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db.exec(`
      -- Launches table
      CREATE TABLE IF NOT EXISTS launches (
        id TEXT PRIMARY KEY,
        mint TEXT UNIQUE,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        description TEXT,
        image TEXT,
        total_supply REAL NOT NULL,
        circulating_supply REAL DEFAULT 0,
        dev_allocation REAL NOT NULL,
        liquidity_allocation REAL NOT NULL,
        holder_rewards_allocation REAL DEFAULT 0,
        public_sale_allocation REAL DEFAULT 0,
        dev_vesting_months INTEGER NOT NULL,
        liquidity_lock_months INTEGER NOT NULL,
        max_wallet_percent REAL DEFAULT 2,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        launch_at TEXT,
        graduated_at TEXT,
        creator TEXT NOT NULL,
        creator_type TEXT DEFAULT 'human',
        agent_id TEXT,
        raised REAL DEFAULT 0,
        holders INTEGER DEFAULT 0,
        volume_24h REAL DEFAULT 0,
        price_change_24h REAL DEFAULT 0
      );

      -- Holders table
      CREATE TABLE IF NOT EXISTS holders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        launch_id TEXT NOT NULL,
        balance REAL DEFAULT 0,
        cost_basis REAL DEFAULT 0,
        first_buy_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        hold_duration_days INTEGER DEFAULT 0,
        diamond_multiplier REAL DEFAULT 1.0,
        rewards_accrued REAL DEFAULT 0,
        rewards_claimed REAL DEFAULT 0,
        diamond_rank TEXT DEFAULT 'Paper',
        global_holder_score INTEGER DEFAULT 0,
        is_bundler INTEGER DEFAULT 0,
        bundle_penalty TEXT,
        FOREIGN KEY (launch_id) REFERENCES launches(id),
        UNIQUE(wallet, launch_id)
      );

      -- Buy records for bundle detection
      CREATE TABLE IF NOT EXISTS buy_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signature TEXT UNIQUE NOT NULL,
        wallet TEXT NOT NULL,
        launch_id TEXT NOT NULL,
        amount REAL NOT NULL,
        tokens_received REAL NOT NULL,
        slot INTEGER,
        timestamp INTEGER NOT NULL,
        is_bundled INTEGER DEFAULT 0,
        bundle_confidence INTEGER DEFAULT 0,
        bundle_action TEXT,
        FOREIGN KEY (launch_id) REFERENCES launches(id)
      );

      -- Bundle analysis results
      CREATE TABLE IF NOT EXISTS bundle_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tx_signature TEXT NOT NULL,
        launch_id TEXT NOT NULL,
        is_bundled INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        flags TEXT, -- JSON
        related_wallets TEXT, -- JSON
        funding_source TEXT,
        action TEXT NOT NULL,
        penalty TEXT, -- JSON
        analyzed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (launch_id) REFERENCES launches(id)
      );

      -- Known bundlers
      CREATE TABLE IF NOT EXISTS known_bundlers (
        wallet TEXT PRIMARY KEY,
        first_detected_at TEXT NOT NULL,
        total_incidents INTEGER DEFAULT 1,
        launches_affected TEXT, -- JSON array of launch IDs
        notes TEXT
      );

      -- Vesting schedules
      CREATE TABLE IF NOT EXISTS vesting_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        launch_id TEXT NOT NULL,
        total_amount REAL NOT NULL,
        released_amount REAL DEFAULT 0,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        cliff_date TEXT,
        vesting_type TEXT DEFAULT 'linear',
        release_frequency TEXT DEFAULT 'monthly',
        FOREIGN KEY (launch_id) REFERENCES launches(id),
        UNIQUE(wallet, launch_id)
      );

      -- Reward claims
      CREATE TABLE IF NOT EXISTS reward_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet TEXT NOT NULL,
        launch_id TEXT NOT NULL,
        amount REAL NOT NULL,
        tx_signature TEXT,
        claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (launch_id) REFERENCES launches(id)
      );

      -- Global holder scores (across all launches)
      CREATE TABLE IF NOT EXISTS global_scores (
        wallet TEXT PRIMARY KEY,
        total_launches INTEGER DEFAULT 0,
        total_hold_days INTEGER DEFAULT 0,
        avg_hold_days REAL DEFAULT 0,
        diamond_launches INTEGER DEFAULT 0, -- Launches held 90+ days
        rugs_survived INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        tier TEXT DEFAULT 'bronze',
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_holders_wallet ON holders(wallet);
      CREATE INDEX IF NOT EXISTS idx_holders_launch ON holders(launch_id);
      CREATE INDEX IF NOT EXISTS idx_holders_rank ON holders(diamond_rank);
      CREATE INDEX IF NOT EXISTS idx_buys_launch ON buy_records(launch_id);
      CREATE INDEX IF NOT EXISTS idx_buys_wallet ON buy_records(wallet);
      CREATE INDEX IF NOT EXISTS idx_buys_timestamp ON buy_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_launches_status ON launches(status);
      CREATE INDEX IF NOT EXISTS idx_vesting_wallet ON vesting_schedules(wallet);
    `);
  }

  // ============ Launch Operations ============

  createLaunch(launch: Launch): void {
    const stmt = this.db.prepare(`
      INSERT INTO launches (
        id, mint, name, symbol, description, image,
        total_supply, dev_allocation, liquidity_allocation, 
        holder_rewards_allocation, dev_vesting_months, liquidity_lock_months,
        max_wallet_percent, status, created_at, creator, creator_type, agent_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      launch.id, launch.mint, launch.name, launch.symbol,
      launch.description, launch.image, launch.totalSupply,
      launch.devAllocation, launch.liquidityAllocation,
      launch.holderRewardsAllocation, launch.devVestingMonths,
      launch.liquidityLockMonths, launch.maxWalletPercent,
      launch.status, launch.createdAt.toISOString(),
      launch.creator, launch.creatorType, launch.agentId
    );
  }

  getLaunch(id: string): Launch | null {
    const stmt = this.db.prepare('SELECT * FROM launches WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.rowToLaunch(row) : null;
  }

  getLaunches(status?: string, limit: number = 50): Launch[] {
    let query = 'SELECT * FROM launches';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToLaunch);
  }

  updateLaunchStatus(id: string, status: string): void {
    const stmt = this.db.prepare('UPDATE launches SET status = ? WHERE id = ?');
    stmt.run(status, id);
  }

  updateLaunchStats(id: string, stats: { raised?: number; holders?: number; volume24h?: number }): void {
    const updates: string[] = [];
    const params: any[] = [];

    if (stats.raised !== undefined) {
      updates.push('raised = ?');
      params.push(stats.raised);
    }
    if (stats.holders !== undefined) {
      updates.push('holders = ?');
      params.push(stats.holders);
    }
    if (stats.volume24h !== undefined) {
      updates.push('volume_24h = ?');
      params.push(stats.volume24h);
    }

    if (updates.length === 0) return;

    params.push(id);
    const stmt = this.db.prepare(`UPDATE launches SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  }

  // ============ Holder Operations ============

  upsertHolder(holder: Holder): void {
    const stmt = this.db.prepare(`
      INSERT INTO holders (
        wallet, launch_id, balance, cost_basis, first_buy_at, last_activity_at,
        hold_duration_days, diamond_multiplier, rewards_accrued, rewards_claimed,
        diamond_rank, global_holder_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet, launch_id) DO UPDATE SET
        balance = excluded.balance,
        last_activity_at = excluded.last_activity_at,
        hold_duration_days = excluded.hold_duration_days,
        diamond_multiplier = excluded.diamond_multiplier,
        rewards_accrued = excluded.rewards_accrued,
        diamond_rank = excluded.diamond_rank
    `);

    stmt.run(
      holder.wallet, holder.launchId, holder.balance, holder.costBasis,
      holder.firstBuyAt.toISOString(), holder.lastActivityAt.toISOString(),
      holder.holdDurationDays, holder.diamondMultiplier, holder.rewardsAccrued,
      holder.rewardsClaimed, holder.diamondRank, holder.globalHolderScore
    );
  }

  getHolder(wallet: string, launchId: string): Holder | null {
    const stmt = this.db.prepare('SELECT * FROM holders WHERE wallet = ? AND launch_id = ?');
    const row = stmt.get(wallet, launchId) as any;
    return row ? this.rowToHolder(row) : null;
  }

  getHoldersByLaunch(launchId: string, limit: number = 100): Holder[] {
    const stmt = this.db.prepare(`
      SELECT * FROM holders 
      WHERE launch_id = ? 
      ORDER BY balance DESC 
      LIMIT ?
    `);
    const rows = stmt.all(launchId, limit) as any[];
    return rows.map(this.rowToHolder);
  }

  getHoldersByWallet(wallet: string): Holder[] {
    const stmt = this.db.prepare('SELECT * FROM holders WHERE wallet = ?');
    const rows = stmt.all(wallet) as any[];
    return rows.map(this.rowToHolder);
  }

  getDiamondLeaderboard(launchId?: string, limit: number = 100): Holder[] {
    let query = `
      SELECT * FROM holders 
      WHERE hold_duration_days >= 30
    `;
    const params: any[] = [];

    if (launchId) {
      query += ' AND launch_id = ?';
      params.push(launchId);
    }

    query += ' ORDER BY hold_duration_days DESC, balance DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToHolder);
  }

  markAsBundler(wallet: string, launchId: string, penalty: string): void {
    const stmt = this.db.prepare(`
      UPDATE holders 
      SET is_bundler = 1, bundle_penalty = ? 
      WHERE wallet = ? AND launch_id = ?
    `);
    stmt.run(penalty, wallet, launchId);
  }

  // ============ Buy Record Operations ============

  recordBuy(buy: {
    signature: string;
    wallet: string;
    launchId: string;
    amount: number;
    tokensReceived: number;
    slot?: number;
    timestamp: number;
    isBundled?: boolean;
    bundleConfidence?: number;
    bundleAction?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO buy_records (
        signature, wallet, launch_id, amount, tokens_received,
        slot, timestamp, is_bundled, bundle_confidence, bundle_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      buy.signature, buy.wallet, buy.launchId, buy.amount,
      buy.tokensReceived, buy.slot, buy.timestamp,
      buy.isBundled ? 1 : 0, buy.bundleConfidence || 0, buy.bundleAction
    );
  }

  getRecentBuys(launchId: string, limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM buy_records 
      WHERE launch_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(launchId, limit) as any[];
  }

  // ============ Bundle Detection Operations ============

  saveBundleAnalysis(analysis: BundleAnalysis): void {
    const stmt = this.db.prepare(`
      INSERT INTO bundle_analyses (
        tx_signature, launch_id, is_bundled, confidence,
        flags, related_wallets, funding_source, action, penalty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      analysis.transactionSignature, analysis.launchId,
      analysis.isBundled ? 1 : 0, analysis.confidence,
      JSON.stringify(analysis.flags), JSON.stringify(analysis.relatedWallets),
      analysis.fundingSource, analysis.action,
      analysis.penaltyApplied ? JSON.stringify(analysis.penaltyApplied) : null
    );
  }

  addKnownBundler(wallet: string, launchId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO known_bundlers (wallet, first_detected_at, launches_affected)
      VALUES (?, ?, ?)
      ON CONFLICT(wallet) DO UPDATE SET
        total_incidents = total_incidents + 1,
        launches_affected = json_insert(launches_affected, '$[#]', ?)
    `);
    stmt.run(wallet, new Date().toISOString(), JSON.stringify([launchId]), launchId);
  }

  isKnownBundler(wallet: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM known_bundlers WHERE wallet = ?');
    return !!stmt.get(wallet);
  }

  getKnownBundlers(): string[] {
    const stmt = this.db.prepare('SELECT wallet FROM known_bundlers');
    const rows = stmt.all() as any[];
    return rows.map(r => r.wallet);
  }

  // ============ Global Score Operations ============

  updateGlobalScore(wallet: string, score: {
    totalLaunches: number;
    totalHoldDays: number;
    avgHoldDays: number;
    diamondLaunches: number;
    score: number;
    tier: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO global_scores (
        wallet, total_launches, total_hold_days, avg_hold_days,
        diamond_launches, score, tier, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(wallet) DO UPDATE SET
        total_launches = excluded.total_launches,
        total_hold_days = excluded.total_hold_days,
        avg_hold_days = excluded.avg_hold_days,
        diamond_launches = excluded.diamond_launches,
        score = excluded.score,
        tier = excluded.tier,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      wallet, score.totalLaunches, score.totalHoldDays, score.avgHoldDays,
      score.diamondLaunches, score.score, score.tier, new Date().toISOString()
    );
  }

  getGlobalScore(wallet: string): any {
    const stmt = this.db.prepare('SELECT * FROM global_scores WHERE wallet = ?');
    return stmt.get(wallet);
  }

  // ============ Stats ============

  getStats(): {
    totalLaunches: number;
    activeLaunches: number;
    totalHolders: number;
    diamondHands: number;
    bundlersDetected: number;
  } {
    const launches = this.db.prepare('SELECT COUNT(*) as c FROM launches').get() as any;
    const active = this.db.prepare("SELECT COUNT(*) as c FROM launches WHERE status = 'active'").get() as any;
    const holders = this.db.prepare('SELECT COUNT(DISTINCT wallet) as c FROM holders').get() as any;
    const diamonds = this.db.prepare('SELECT COUNT(*) as c FROM holders WHERE hold_duration_days >= 90').get() as any;
    const bundlers = this.db.prepare('SELECT COUNT(*) as c FROM known_bundlers').get() as any;

    return {
      totalLaunches: launches.c,
      activeLaunches: active.c,
      totalHolders: holders.c,
      diamondHands: diamonds.c,
      bundlersDetected: bundlers.c
    };
  }

  // ============ Helpers ============

  private rowToLaunch(row: any): Launch {
    return {
      id: row.id,
      mint: row.mint,
      name: row.name,
      symbol: row.symbol,
      description: row.description,
      image: row.image,
      totalSupply: row.total_supply,
      circulatingSupply: row.circulating_supply,
      devAllocation: row.dev_allocation,
      liquidityAllocation: row.liquidity_allocation,
      holderRewardsAllocation: row.holder_rewards_allocation,
      publicSaleAllocation: row.public_sale_allocation,
      devVestingMonths: row.dev_vesting_months,
      liquidityLockMonths: row.liquidity_lock_months,
      maxWalletPercent: row.max_wallet_percent,
      status: row.status,
      createdAt: new Date(row.created_at),
      launchAt: row.launch_at ? new Date(row.launch_at) : undefined,
      graduatedAt: row.graduated_at ? new Date(row.graduated_at) : undefined,
      creator: row.creator,
      creatorType: row.creator_type,
      agentId: row.agent_id,
      raised: row.raised,
      holders: row.holders,
      volume24h: row.volume_24h,
      priceChange24h: row.price_change_24h
    };
  }

  private rowToHolder(row: any): Holder {
    return {
      wallet: row.wallet,
      launchId: row.launch_id,
      balance: row.balance,
      costBasis: row.cost_basis,
      firstBuyAt: new Date(row.first_buy_at),
      lastActivityAt: new Date(row.last_activity_at),
      holdDurationDays: row.hold_duration_days,
      diamondMultiplier: row.diamond_multiplier,
      rewardsAccrued: row.rewards_accrued,
      rewardsClaimed: row.rewards_claimed,
      diamondRank: row.diamond_rank,
      globalHolderScore: row.global_holder_score
    };
  }
}

export const db = new DiamondPadDB();
