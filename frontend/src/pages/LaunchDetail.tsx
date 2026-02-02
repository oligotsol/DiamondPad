import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { ArrowLeft, Clock, Users, TrendingUp, Lock, Shield, Zap } from 'lucide-react';

interface Launch {
  id: string;
  name: string;
  symbol: string;
  description: string;
  status: 'pending' | 'active' | 'graduated' | 'failed';
  raised: number;
  holders: number;
  devAllocation: number;
  devVestingMonths: number;
  liquidityLockMonths: number;
  holderRewardsAllocation: number;
  totalSupply: number;
  createdAt: string;
}

interface AllocationPool {
  pool: string;
  percent: number;
  status: string;
  allocated: number;
  remaining: number;
}

const MOCK_LAUNCH: Launch = {
  id: 'launch_001',
  name: 'AgentSwarm',
  symbol: 'SWARM',
  description: 'Decentralized AI agent coordination protocol. AgentSwarm enables autonomous AI agents to discover, communicate, and collaborate on tasks without centralized coordination.',
  status: 'active',
  raised: 45000,
  holders: 234,
  devAllocation: 5,
  devVestingMonths: 12,
  liquidityLockMonths: 12,
  holderRewardsAllocation: 10,
  totalSupply: 1000000000,
  createdAt: new Date().toISOString(),
};

const MOCK_POOLS: AllocationPool[] = [
  { pool: 'guaranteed', percent: 30, status: 'open', allocated: 150000000, remaining: 150000000 },
  { pool: 'weighted_lottery', percent: 25, status: 'open', allocated: 100000000, remaining: 150000000 },
  { pool: 'public_lottery', percent: 10, status: 'open', allocated: 50000000, remaining: 50000000 },
  { pool: 'fcfs', percent: 5, status: 'pending', allocated: 0, remaining: 50000000 },
  { pool: 'flipper', percent: 5, status: 'pending', allocated: 0, remaining: 50000000 },
  { pool: 'liquidity', percent: 15, status: 'auto', allocated: 150000000, remaining: 0 },
  { pool: 'trader_rewards', percent: 10, status: 'auto', allocated: 100000000, remaining: 0 },
];

export function LaunchDetail() {
  const { id } = useParams();
  const { connected, publicKey } = useWallet();
  const [launch, setLaunch] = useState<Launch | null>(MOCK_LAUNCH);
  const [pools, setPools] = useState<AllocationPool[]>(MOCK_POOLS);
  const [selectedPool, setSelectedPool] = useState<string>('');
  const [requestAmount, setRequestAmount] = useState<string>('');

  useEffect(() => {
    // Fetch launch details
    fetch(`/api/launch/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.launch) setLaunch(data.launch);
      })
      .catch(() => {});

    // Fetch allocation pools
    fetch(`/api/staking/allocation/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.launch?.pools) {
          setPools(Object.values(data.launch.pools));
        }
      })
      .catch(() => {});
  }, [id]);

  const handleRequestAllocation = async () => {
    if (!connected || !selectedPool || !requestAmount) return;

    const response = await fetch('/api/staking/allocation/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet: publicKey?.toString(),
        launchId: id,
        pool: selectedPool,
        amountUSD: parseFloat(requestAmount),
      }),
    });

    const data = await response.json();
    if (data.success) {
      alert('Allocation request submitted!');
    } else {
      alert(data.error || 'Request failed');
    }
  };

  if (!launch) {
    return <div className="text-center py-12">Loading...</div>;
  }

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    graduated: 'bg-diamond/20 text-diamond',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link to="/launches" className="inline-flex items-center gap-2 text-gray-400 hover:text-white">
        <ArrowLeft size={18} />
        Back to Launches
      </Link>

      {/* Header */}
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{launch.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm capitalize ${statusColors[launch.status]}`}>
                {launch.status}
              </span>
            </div>
            <div className="text-xl text-gray-400">${launch.symbol}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold gradient-text">
              ${launch.raised.toLocaleString()}
            </div>
            <div className="text-gray-400">raised</div>
          </div>
        </div>

        <p className="mt-4 text-gray-300">{launch.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <StatBox icon={<Users size={18} />} label="Holders" value={launch.holders} />
          <StatBox icon={<Lock size={18} />} label="LP Lock" value={`${launch.liquidityLockMonths}mo`} />
          <StatBox icon={<Shield size={18} />} label="Dev Vest" value={`${launch.devVestingMonths}mo`} />
          <StatBox icon={<Zap size={18} />} label="Rewards Pool" value={`${launch.holderRewardsAllocation}%`} />
        </div>
      </div>

      {/* Allocation Pools */}
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Allocation Pools</h2>
        
        <div className="space-y-3">
          {pools.map(pool => (
            <PoolRow 
              key={pool.pool} 
              pool={pool} 
              selected={selectedPool === pool.pool}
              onSelect={() => pool.status === 'open' && setSelectedPool(pool.pool)}
            />
          ))}
        </div>
      </div>

      {/* Request Allocation */}
      <div className="bg-dark-800 border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Request Allocation</h2>
        
        {!connected ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">Connect wallet to request allocation</p>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Pool</label>
              <div className="grid grid-cols-3 gap-2">
                {pools.filter(p => p.status === 'open').map(pool => (
                  <button
                    key={pool.pool}
                    onClick={() => setSelectedPool(pool.pool)}
                    className={`py-2 px-4 rounded-lg capitalize transition ${
                      selectedPool === pool.pool
                        ? 'bg-diamond text-black font-semibold'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {pool.pool.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
              <input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-dark-900 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-diamond"
              />
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 2500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setRequestAmount(amt.toString())}
                    className="px-3 py-1 bg-white/5 rounded text-sm hover:bg-white/10"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRequestAllocation}
              disabled={!selectedPool || !requestAmount}
              className="w-full py-3 bg-gradient-to-r from-diamond to-emerald-400 text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Request Allocation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="flex justify-center text-diamond mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-gray-400 text-sm">{label}</div>
    </div>
  );
}

function PoolRow({ pool, selected, onSelect }: { pool: AllocationPool; selected: boolean; onSelect: () => void }) {
  const poolNames: Record<string, string> = {
    guaranteed: '💎 Guaranteed',
    weighted_lottery: '🎲 Weighted Lottery',
    public_lottery: '🎫 Public Lottery',
    fcfs: '⚡ FCFS',
    flipper: '🔄 Flipper',
    liquidity: '💧 Liquidity',
    trader_rewards: '📈 Trader Rewards',
  };

  const isClickable = pool.status === 'open';
  const fillPercent = pool.allocated / (pool.allocated + pool.remaining) * 100;

  return (
    <div 
      onClick={onSelect}
      className={`p-4 rounded-xl border transition ${
        selected 
          ? 'border-diamond bg-diamond/10' 
          : isClickable 
            ? 'border-white/10 hover:border-white/20 cursor-pointer' 
            : 'border-white/5 opacity-60'
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold">{poolNames[pool.pool] || pool.pool}</span>
        <span className="text-gray-400">{pool.percent}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-diamond to-emerald-400 transition-all"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-1 text-sm text-gray-400">
        <span>{(pool.allocated / 1000000).toFixed(1)}M allocated</span>
        <span className={pool.status === 'open' ? 'text-emerald-400' : ''}>{pool.status}</span>
      </div>
    </div>
  );
}
