import { Link } from 'react-router-dom';
import { ArrowRight, Shield, TrendingUp, Users, Zap } from 'lucide-react';

const TIERS = [
  { emoji: '💎', name: 'Diamond', days: '180+', multiplier: '10x', stake: '100k+', color: 'text-diamond' },
  { emoji: '🥇', name: 'Gold', days: '90+', multiplier: '5x', stake: '50k', color: 'text-gold' },
  { emoji: '🥈', name: 'Silver', days: '60+', multiplier: '2.5x', stake: '20k', color: 'text-gray-300' },
  { emoji: '🥉', name: 'Bronze', days: '30+', multiplier: '1x', stake: '5k', color: 'text-amber-600' },
  { emoji: '📄', name: 'Public', days: '0', multiplier: '0.25x', stake: '0', color: 'text-gray-500' },
];

const STATS = [
  { label: 'Target Graduation Rate', value: '15%+', subtext: 'vs 1.4% pump.fun' },
  { label: 'Holder Retention (30d)', value: '60%+', subtext: 'vs ~20% industry' },
  { label: 'Public Pool Access', value: '20%', subtext: 'Zero staking required' },
];

export function Home() {
  return (
    <div className="space-y-20 py-8">
      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="text-6xl mb-4">💎</div>
        <h1 className="text-5xl md:text-6xl font-extrabold gradient-text">
          Launch to Last
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          The launchpad for believers. Where real projects meet diamond hands.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link 
            to="/launches" 
            className="px-8 py-3 bg-gradient-to-r from-diamond to-emerald-400 text-black font-semibold rounded-full hover:opacity-90 transition flex items-center gap-2"
          >
            Explore Launches <ArrowRight size={18} />
          </Link>
          <Link 
            to="/staking" 
            className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/5 transition"
          >
            Stake $LAUNCH
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid md:grid-cols-3 gap-6">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-dark-800 border border-white/10 rounded-2xl p-6 text-center card-glow">
            <div className="text-4xl font-bold gradient-text">{stat.value}</div>
            <div className="text-gray-400 mt-1">{stat.label}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.subtext}</div>
          </div>
        ))}
      </section>

      {/* Value Props */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Why DiamondPad?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ValueCard 
            icon={<Shield className="text-diamond" />}
            title="For Believers"
            description="Guaranteed allocations and priority access for committed holders. Diamond hands get diamond treatment."
          />
          <ValueCard 
            icon={<TrendingUp className="text-emerald-400" />}
            title="Better Odds"
            description="15% graduation rate target vs 1.4% industry average. Real projects with real chances."
          />
          <ValueCard 
            icon={<Users className="text-gold" />}
            title="Trader Friendly"
            description="20% of every launch is public pools. Zero staking required for basic access."
          />
          <ValueCard 
            icon={<Zap className="text-purple-400" />}
            title="Deep Liquidity"
            description="Mandatory locked LP + market makers. You can actually exit when you want."
          />
        </div>
      </section>

      {/* Tiers */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Staking Tiers</h2>
          <p className="text-gray-400 mt-2">Higher stakes + longer locks = better access</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {TIERS.map((tier, i) => (
            <div key={i} className="bg-dark-800 border border-white/10 rounded-xl p-4 text-center card-glow">
              <div className="text-4xl mb-2">{tier.emoji}</div>
              <div className={`font-semibold ${tier.color}`}>{tier.name}</div>
              <div className="text-gray-500 text-sm">{tier.stake} $LAUNCH</div>
              <div className="text-2xl font-bold mt-2 gradient-text">{tier.multiplier}</div>
              <div className="text-gray-500 text-xs">weight</div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link to="/staking" className="text-diamond hover:underline">
            Learn more about tiers →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-6 py-12">
        <h2 className="text-3xl font-bold">Ready to believe?</h2>
        <p className="text-gray-400 max-w-xl mx-auto">
          Join the launchpad where commitment meets opportunity. 
          Stake once, win forever.
        </p>
        <Link 
          to="/staking" 
          className="inline-block px-10 py-4 bg-gradient-to-r from-diamond to-emerald-400 text-black font-semibold rounded-full hover:opacity-90 transition text-lg"
        >
          Start Staking
        </Link>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-dark-800 border border-white/10 rounded-xl p-6 card-glow">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
