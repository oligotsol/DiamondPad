import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Diamond, Rocket, Coins } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="border-b border-white/10 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-3xl">💎</span>
            <span className="text-xl font-bold gradient-text">DiamondPad</span>
          </Link>
          
          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/launches" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/launches') ? 'text-diamond' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Rocket size={18} />
              <span>Launches</span>
            </Link>
            <Link 
              to="/staking" 
              className={`flex items-center gap-2 transition-colors ${
                isActive('/staking') ? 'text-diamond' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Coins size={18} />
              <span>Staking</span>
            </Link>
          </div>
          
          {/* Wallet */}
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
