import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Users, TrendingUp, Droplets } from 'lucide-react';

interface Launch {
  id: string;
  name: string;
  symbol: string;
  description: string;
  status: 'pending' | 'active' | 'graduated' | 'failed';
  raised: number;
  holders: number;
  devAllocation: number;
  liquidityLockMonths: number;
  createdAt: string;
}

const MOCK_LAUNCHES: Launch[] = [
  {
    id: 'launch_001',
    name: 'AgentSwarm',
    symbol: 'SWARM',
    description: 'Decentralized AI agent coordination protocol',
    status: 'active',
    raised: 45000,
    holders: 234,
    devAllocation: 5,
    liquidityLockMonths: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'launch_002',
    name: 'DiamondDAO',
    symbol: 'DDAO',
    description: 'Governance token for the DiamondPad ecosystem',
    status: 'active',
    raised: 120000,
    holders: 567,
    devAllocation: 8,
    liquidityLockMonths: 24,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'launch_003',
    name: 'RWA Finance',
    symbol: 'RWAF',
    description: 'Real world asset tokenization platform',
    status: 'pending',
    raised: 0,
    holders: 0,
    devAllocation: 10,
    liquidityLockMonths: 18,
    createdAt: new Date().toISOString(),
  },
];

export function Launches() {
  const [launches, setLaunches] = useState<Launch[]>(MOCK_LAUNCHES);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // Fetch real launches from API
    fetch('/api/launches')
      .then(res => res.json())
      .then(data => {
        if (data.launches?.length > 0) {
          setLaunches(data.launches);
        }
      })
      .catch(() => {
        // Use mock data if API unavailable
      });
  }, []);

  const filteredLaunches = filter === 'all' 
    ? launches 
    : launches.filter(l => l.status === filter);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Launches</h1>
          <p className="text-gray-400">Curated projects for believers</p>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'graduated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                filter === f 
                  ? 'bg-diamond text-black font-semibold' 
                  : 'bg-dark-800 text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Launch Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLaunches.map(launch => (
          <LaunchCard key={launch.id} launch={launch} />
        ))}
      </div>

      {filteredLaunches.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No launches found for this filter.
        </div>
      )}
    </div>
  );
}

function LaunchCard({ launch }: { launch: Launch }) {
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    active: 'bg-emerald-500/20 text-emerald-400',
    graduated: 'bg-diamond/20 text-diamond',
    failed: 'bg-red-500/20 text-red-400',
  };

  return (
    <Link 
      to={`/launch/${launch.id}`}
      className="bg-dark-800 border border-white/10 rounded-2xl p-6 card-glow hover:border-diamond/30 transition block"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold">{launch.name}</h3>
          <span className="text-gray-400">${launch.symbol}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm capitalize ${statusColors[launch.status]}`}>
          {launch.status}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {launch.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-gray-400">Raised:</span>
          <span className="font-semibold">${launch.raised.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users size={14} className="text-diamond" />
          <span className="text-gray-400">Holders:</span>
          <span className="font-semibold">{launch.holders}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-gold" />
          <span className="text-gray-400">LP Lock:</span>
          <span className="font-semibold">{launch.liquidityLockMonths}mo</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Droplets size={14} className="text-purple-400" />
          <span className="text-gray-400">Dev:</span>
          <span className="font-semibold">{launch.devAllocation}%</span>
        </div>
      </div>
    </Link>
  );
}
