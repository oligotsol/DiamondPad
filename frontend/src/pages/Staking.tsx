import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Lock, Unlock, TrendingUp, Info, CheckCircle } from 'lucide-react';

interface TierConfig {
  name: string;
  emoji: string;
  minStake: number;
  lockDays: number;
  allocationWeight: number;
  guaranteedAllocation: boolean;
  lotteryBoost: number;
  feeDiscount: number;
  priorityAccess: boolean;
}

interface StakerPosition {
  wallet: string;
  stakedAmount: number;
  tier: string;
  lockEndDate: string;
  strongHolderScore: number;
  effectiveWeight: number;
}

const TIERS: Record<string, TierConfig> = {
  diamond: {
    name: 'Diamond',
    emoji: '💎',
    minStake: 100000,
    lockDays: 180,
    allocationWeight: 10,
    guaranteedAllocation: true,
    lotteryBoost: 5,
    feeDiscount: 0.6,
    priorityAccess: true,
  },
  gold: {
    name: 'Gold',
    emoji: '🥇',
    minStake: 50000,
    lockDays: 90,
    allocationWeight: 5,
    guaranteedAllocation: true,
    lotteryBoost: 3,
    feeDiscount: 0.4,
    priorityAccess: true,
  },
  silver: {
    name: 'Silver',
    emoji: '🥈',
    minStake: 20000,
    lockDays: 60,
    allocationWeight: 2.5,
    guaranteedAllocation: false,
    lotteryBoost: 2,
    feeDiscount: 0.25,
    priorityAccess: false,
  },
  bronze: {
    name: 'Bronze',
    emoji: '🥉',
    minStake: 5000,
    lockDays: 30,
    allocationWeight: 1,
    guaranteedAllocation: false,
    lotteryBoost: 1.5,
    feeDiscount: 0.1,
    priorityAccess: false,
  },
  public: {
    name: 'Public',
    emoji: '📄',
    minStake: 0,
    lockDays: 0,
    allocationWeight: 0.25,
    guaranteedAllocation: false,
    lotteryBoost: 1,
    feeDiscount: 0,
    priorityAccess: false,
  },
};

export function Staking() {
  const { publicKey, connected } = useWallet();
  const [position, setPosition] = useState<StakerPosition | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [lockDays, setLockDays] = useState<number>(30);
  const [preview, setPreview] = useState<any>(null);

  // Fetch user position
  useEffect(() => {
    if (connected && publicKey) {
      fetch(`/api/staking/position/${publicKey.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (data.position) {
            setPosition(data.position);
          }
        })
        .catch(() => {});
    }
  }, [connected, publicKey]);

  // Simulate stake preview
  useEffect(() => {
    const amount = parseFloat(stakeAmount) || 0;
    if (amount > 0) {
      fetch('/api/staking/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeAmount: amount, lockDays }),
      })
        .then(res => res.json())
        .then(data => setPreview(data.simulation))
        .catch(() => {
          // Calculate locally if API unavailable
          let tier = 'public';
          if (amount >= 100000 && lockDays >= 180) tier = 'diamond';
          else if (amount >= 50000 && lockDays >= 90) tier = 'gold';
          else if (amount >= 20000 && lockDays >= 60) tier = 'silver';
          else if (amount >= 5000 && lockDays >= 30) tier = 'bronze';
          
          setPreview({
            result: {
              tier,
              tierEmoji: TIERS[tier].emoji,
              tierName: TIERS[tier].name,
              baseWeight: TIERS[tier].allocationWeight,
              effectiveWeight: TIERS[tier].allocationWeight,
              benefits: {
                guaranteedAllocation: TIERS[tier].guaranteedAllocation,
                lotteryBoost: `${TIERS[tier].lotteryBoost}x`,
                feeDiscount: `${TIERS[tier].feeDiscount * 100}%`,
                priorityAccess: TIERS[tier].priorityAccess,
              },
            },
          });
        });
    }
  }, [stakeAmount, lockDays]);

  const handleStake = async () => {
    if (!connected || !publicKey) return;
    
    // In production, this would create and send a Solana transaction
    alert(`Would stake ${stakeAmount} $LAUNCH for ${lockDays} days.\n\nTransaction signing coming soon!`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Stake $LAUNCH</h1>
        <p className="text-gray-400">Lock tokens to unlock tier benefits</p>
      </div>

      {/* Current Position */}
      {connected && position && (
        <div className="bg-dark-800 border border-diamond/30 rounded-2xl p-6 card-glow">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock size={20} className="text-diamond" />
            Your Position
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Tier</div>
              <div className="text-2xl font-bold">
                {TIERS[position.tier]?.emoji} {position.tier}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Staked</div>
              <div className="text-2xl font-bold">
                {position.stakedAmount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">SHS</div>
              <div className="text-2xl font-bold">
                {position.strongHolderScore}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Weight</div>
              <div className="text-2xl font-bold gradient-text">
                {position.effectiveWeight.toFixed(1)}x
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Stake Form */}
        <div className="bg-dark-800 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Stake Tokens</h2>
          
          {!connected ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Connect wallet to stake</p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount ($LAUNCH)</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 text-xl focus:outline-none focus:border-diamond"
                />
                <div className="flex gap-2 mt-2">
                  {[5000, 20000, 50000, 100000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setStakeAmount(amt.toString())}
                      className="px-3 py-1 bg-white/5 rounded text-sm hover:bg-white/10"
                    >
                      {amt >= 1000 ? `${amt/1000}k` : amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lock Period */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Lock Period (days)</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 180].map(days => (
                    <button
                      key={days}
                      onClick={() => setLockDays(days)}
                      className={`flex-1 py-2 rounded-lg transition ${
                        lockDays === days 
                          ? 'bg-diamond text-black font-semibold' 
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Button */}
              <button
                onClick={handleStake}
                disabled={!stakeAmount || parseFloat(stakeAmount) <= 0}
                className="w-full py-3 bg-gradient-to-r from-diamond to-emerald-400 text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Stake $LAUNCH
              </button>

              <p className="text-center text-gray-500 text-sm">
                10% penalty for early unstake
              </p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-dark-800 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Tier Preview</h2>
          
          {preview?.result ? (
            <div className="space-y-4">
              {/* Tier Display */}
              <div className="text-center py-4 bg-dark-900 rounded-xl">
                <div className="text-5xl mb-2">{preview.result.tierEmoji}</div>
                <div className="text-2xl font-bold">{preview.result.tierName}</div>
                <div className="text-diamond text-lg">
                  {preview.result.effectiveWeight}x allocation weight
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <BenefitRow 
                  label="Guaranteed Allocation" 
                  value={preview.result.benefits.guaranteedAllocation} 
                  type="boolean"
                />
                <BenefitRow 
                  label="Lottery Boost" 
                  value={preview.result.benefits.lotteryBoost} 
                />
                <BenefitRow 
                  label="Fee Discount" 
                  value={preview.result.benefits.feeDiscount} 
                />
                <BenefitRow 
                  label="Priority Access" 
                  value={preview.result.benefits.priorityAccess} 
                  type="boolean"
                />
              </div>

              {/* Upgrade Hint */}
              {preview.upgradeHint && (
                <div className="p-3 bg-gold/10 border border-gold/20 rounded-lg text-sm text-gold">
                  <Info size={14} className="inline mr-2" />
                  {preview.upgradeHint}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Enter an amount to preview your tier
            </div>
          )}
        </div>
      </div>

      {/* Tier Comparison */}
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Tier Comparison</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-white/10">
              <th className="text-left py-3">Tier</th>
              <th className="text-right py-3">Min Stake</th>
              <th className="text-right py-3">Lock Days</th>
              <th className="text-right py-3">Weight</th>
              <th className="text-right py-3">Guaranteed</th>
              <th className="text-right py-3">Lottery</th>
              <th className="text-right py-3">Fee Discount</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(TIERS).map(([key, tier]) => (
              <tr key={key} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3">
                  <span className="mr-2">{tier.emoji}</span>
                  {tier.name}
                </td>
                <td className="text-right">{tier.minStake.toLocaleString()}</td>
                <td className="text-right">{tier.lockDays}</td>
                <td className="text-right font-semibold text-diamond">{tier.allocationWeight}x</td>
                <td className="text-right">
                  {tier.guaranteedAllocation ? '✅' : '—'}
                </td>
                <td className="text-right">{tier.lotteryBoost}x</td>
                <td className="text-right">{tier.feeDiscount * 100}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BenefitRow({ label, value, type = 'string' }: { label: string; value: any; type?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold">
        {type === 'boolean' ? (
          value ? <CheckCircle size={18} className="text-emerald-400" /> : <span className="text-gray-500">—</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
