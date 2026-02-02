use anchor_lang::prelude::*;

declare_id!("DiamPad1111111111111111111111111111111111");

/// DiamondPad - The launchpad that rewards believers, not flippers
/// 
/// This program handles:
/// 1. Token launches with enforced safety settings
/// 2. Holder position tracking with timestamps
/// 3. Diamond rank calculation and rewards
/// 4. Dev vesting schedules

#[program]
pub mod diamondpad {
    use super::*;

    /// Initialize the DiamondPad protocol
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.total_launches = 0;
        protocol.total_holders = 0;
        protocol.total_bundlers_caught = 0;
        protocol.bump = ctx.bumps.protocol;
        Ok(())
    }

    /// Create a new token launch with enforced safety settings
    pub fn create_launch(
        ctx: Context<CreateLaunch>,
        name: String,
        symbol: String,
        total_supply: u64,
        dev_allocation_bps: u16,     // Max 1000 (10%)
        dev_vesting_days: u16,       // Min 180 days
        lp_lock_days: u16,           // Min 365 days
        holder_rewards_bps: u16,     // Recommended 500-1500 (5-15%)
    ) -> Result<()> {
        // Enforce safety limits
        require!(dev_allocation_bps <= 1000, DiamondPadError::DevAllocationTooHigh);
        require!(dev_vesting_days >= 180, DiamondPadError::VestingTooShort);
        require!(lp_lock_days >= 365, DiamondPadError::LpLockTooShort);
        require!(name.len() <= 32, DiamondPadError::NameTooLong);
        require!(symbol.len() <= 10, DiamondPadError::SymbolTooLong);

        let launch = &mut ctx.accounts.launch;
        let protocol = &mut ctx.accounts.protocol;
        
        launch.creator = ctx.accounts.creator.key();
        launch.name = name;
        launch.symbol = symbol;
        launch.total_supply = total_supply;
        launch.dev_allocation_bps = dev_allocation_bps;
        launch.dev_vesting_days = dev_vesting_days;
        launch.lp_lock_days = lp_lock_days;
        launch.holder_rewards_bps = holder_rewards_bps;
        launch.created_at = Clock::get()?.unix_timestamp;
        launch.launch_id = protocol.total_launches;
        launch.status = LaunchStatus::Pending;
        launch.total_raised = 0;
        launch.holder_count = 0;
        launch.bump = ctx.bumps.launch;

        protocol.total_launches += 1;

        emit!(LaunchCreated {
            launch_id: launch.launch_id,
            creator: launch.creator,
            name: launch.name.clone(),
            symbol: launch.symbol.clone(),
            total_supply,
            dev_allocation_bps,
            dev_vesting_days,
        });

        Ok(())
    }

    /// Record a holder's position (called on buy)
    pub fn record_position(
        ctx: Context<RecordPosition>,
        amount: u64,
    ) -> Result<()> {
        let position = &mut ctx.accounts.position;
        let launch = &mut ctx.accounts.launch;
        let clock = Clock::get()?;

        if position.balance == 0 {
            // New holder
            position.holder = ctx.accounts.holder.key();
            position.launch = launch.key();
            position.first_buy_timestamp = clock.unix_timestamp;
            position.bump = ctx.bumps.position;
            launch.holder_count += 1;
        }

        position.balance = position.balance.checked_add(amount).unwrap();
        position.last_activity_timestamp = clock.unix_timestamp;

        // Calculate diamond rank
        position.diamond_rank = calculate_diamond_rank(
            position.first_buy_timestamp,
            clock.unix_timestamp
        );
        position.multiplier_bps = get_multiplier_bps(position.diamond_rank);

        emit!(PositionUpdated {
            holder: position.holder,
            launch: position.launch,
            balance: position.balance,
            diamond_rank: position.diamond_rank,
            multiplier_bps: position.multiplier_bps,
        });

        Ok(())
    }

    /// Claim holder rewards based on diamond rank
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let position = &mut ctx.accounts.position;
        let clock = Clock::get()?;

        // Update diamond rank first
        position.diamond_rank = calculate_diamond_rank(
            position.first_buy_timestamp,
            clock.unix_timestamp
        );
        position.multiplier_bps = get_multiplier_bps(position.diamond_rank);

        // Calculate rewards (simplified - real impl would check reward pool)
        let base_rewards = position.balance / 100; // 1% base
        let boosted_rewards = base_rewards
            .checked_mul(position.multiplier_bps as u64).unwrap()
            .checked_div(10000).unwrap();

        // Record claim
        position.total_rewards_claimed = position.total_rewards_claimed
            .checked_add(boosted_rewards).unwrap();
        position.last_claim_timestamp = clock.unix_timestamp;

        emit!(RewardsClaimed {
            holder: position.holder,
            launch: position.launch,
            amount: boosted_rewards,
            diamond_rank: position.diamond_rank,
            multiplier_bps: position.multiplier_bps,
        });

        Ok(())
    }

    /// Flag a wallet as a known bundler
    pub fn flag_bundler(
        ctx: Context<FlagBundler>,
        evidence: String,
    ) -> Result<()> {
        let bundler = &mut ctx.accounts.bundler;
        let protocol = &mut ctx.accounts.protocol;

        bundler.wallet = ctx.accounts.flagged_wallet.key();
        bundler.flagged_at = Clock::get()?.unix_timestamp;
        bundler.evidence = evidence;
        bundler.incident_count = 1;
        bundler.bump = ctx.bumps.bundler;

        protocol.total_bundlers_caught += 1;

        emit!(BundlerFlagged {
            wallet: bundler.wallet,
            evidence: bundler.evidence.clone(),
        });

        Ok(())
    }
}

// ============ Helper Functions ============

fn calculate_diamond_rank(first_buy: i64, now: i64) -> DiamondRank {
    let days_held = (now - first_buy) / 86400;
    
    if days_held >= 180 {
        DiamondRank::Diamond
    } else if days_held >= 90 {
        DiamondRank::Platinum
    } else if days_held >= 60 {
        DiamondRank::Gold
    } else if days_held >= 30 {
        DiamondRank::Silver
    } else if days_held >= 7 {
        DiamondRank::Bronze
    } else {
        DiamondRank::Paper
    }
}

fn get_multiplier_bps(rank: DiamondRank) -> u16 {
    match rank {
        DiamondRank::Paper => 10000,     // 1.0x
        DiamondRank::Bronze => 15000,    // 1.5x
        DiamondRank::Silver => 20000,    // 2.0x
        DiamondRank::Gold => 25000,      // 2.5x
        DiamondRank::Platinum => 30000,  // 3.0x
        DiamondRank::Diamond => 35000,   // 3.5x
    }
}

// ============ Accounts ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = Protocol::SIZE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateLaunch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,
    
    #[account(
        init,
        payer = creator,
        space = Launch::SIZE,
        seeds = [b"launch", protocol.total_launches.to_le_bytes().as_ref()],
        bump
    )]
    pub launch: Account<'info, Launch>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPosition<'info> {
    #[account(mut)]
    pub holder: Signer<'info>,
    
    #[account(mut)]
    pub launch: Account<'info, Launch>,
    
    #[account(
        init_if_needed,
        payer = holder,
        space = Position::SIZE,
        seeds = [b"position", launch.key().as_ref(), holder.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    pub holder: Signer<'info>,
    
    pub launch: Account<'info, Launch>,
    
    #[account(
        mut,
        seeds = [b"position", launch.key().as_ref(), holder.key().as_ref()],
        bump = position.bump,
        constraint = position.holder == holder.key()
    )]
    pub position: Account<'info, Position>,
}

#[derive(Accounts)]
pub struct FlagBundler<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump,
        constraint = protocol.authority == authority.key()
    )]
    pub protocol: Account<'info, Protocol>,
    
    /// CHECK: This is the wallet being flagged
    pub flagged_wallet: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = authority,
        space = Bundler::SIZE,
        seeds = [b"bundler", flagged_wallet.key().as_ref()],
        bump
    )]
    pub bundler: Account<'info, Bundler>,
    
    pub system_program: Program<'info, System>,
}

// ============ State ============

#[account]
pub struct Protocol {
    pub authority: Pubkey,
    pub total_launches: u64,
    pub total_holders: u64,
    pub total_bundlers_caught: u64,
    pub bump: u8,
}

impl Protocol {
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 8 + 1 + 64; // discriminator + fields + padding
}

#[account]
pub struct Launch {
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub dev_allocation_bps: u16,
    pub dev_vesting_days: u16,
    pub lp_lock_days: u16,
    pub holder_rewards_bps: u16,
    pub created_at: i64,
    pub launch_id: u64,
    pub status: LaunchStatus,
    pub total_raised: u64,
    pub holder_count: u64,
    pub bump: u8,
}

impl Launch {
    pub const SIZE: usize = 8 + 32 + 36 + 14 + 8 + 2 + 2 + 2 + 2 + 8 + 8 + 1 + 8 + 8 + 1 + 64;
}

#[account]
pub struct Position {
    pub holder: Pubkey,
    pub launch: Pubkey,
    pub balance: u64,
    pub first_buy_timestamp: i64,
    pub last_activity_timestamp: i64,
    pub last_claim_timestamp: i64,
    pub diamond_rank: DiamondRank,
    pub multiplier_bps: u16,
    pub total_rewards_claimed: u64,
    pub bump: u8,
}

impl Position {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 2 + 8 + 1 + 64;
}

#[account]
pub struct Bundler {
    pub wallet: Pubkey,
    pub flagged_at: i64,
    pub evidence: String,
    pub incident_count: u32,
    pub bump: u8,
}

impl Bundler {
    pub const SIZE: usize = 8 + 32 + 8 + 256 + 4 + 1 + 64;
}

// ============ Enums ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LaunchStatus {
    Pending,
    Active,
    Graduated,
    Failed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum DiamondRank {
    Paper,
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
}

// ============ Events ============

#[event]
pub struct LaunchCreated {
    pub launch_id: u64,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub dev_allocation_bps: u16,
    pub dev_vesting_days: u16,
}

#[event]
pub struct PositionUpdated {
    pub holder: Pubkey,
    pub launch: Pubkey,
    pub balance: u64,
    pub diamond_rank: DiamondRank,
    pub multiplier_bps: u16,
}

#[event]
pub struct RewardsClaimed {
    pub holder: Pubkey,
    pub launch: Pubkey,
    pub amount: u64,
    pub diamond_rank: DiamondRank,
    pub multiplier_bps: u16,
}

#[event]
pub struct BundlerFlagged {
    pub wallet: Pubkey,
    pub evidence: String,
}

// ============ Errors ============

#[error_code]
pub enum DiamondPadError {
    #[msg("Dev allocation cannot exceed 10% (1000 bps)")]
    DevAllocationTooHigh,
    
    #[msg("Dev vesting must be at least 180 days")]
    VestingTooShort,
    
    #[msg("LP must be locked for at least 365 days")]
    LpLockTooShort,
    
    #[msg("Token name too long (max 32 chars)")]
    NameTooLong,
    
    #[msg("Token symbol too long (max 10 chars)")]
    SymbolTooLong,
    
    #[msg("Unauthorized")]
    Unauthorized,
}
