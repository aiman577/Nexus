import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getBalance, formatCurrency } from '../../data/wallet';

export const WalletBanner: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Link to="/wallet" data-tour="wallet-banner" className="block">
      <div className="rounded-xl bg-gradient-to-r from-primary-700 to-secondary-600 text-white p-5 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-white/15 rounded-full shrink-0">
              <Wallet size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-primary-100">Wallet balance</p>
              <p className="text-2xl font-bold tracking-tight truncate">
                {formatCurrency(getBalance(user.id))}
              </p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-sm font-medium bg-white/15 hover:bg-white/25 transition-colors duration-200 px-4 py-2 rounded-lg shrink-0">
            Manage Wallet <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
};
