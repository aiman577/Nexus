import { subDays } from 'date-fns';
import { findUserById } from './users';

export type TransactionType = 'deposit' | 'withdraw' | 'transfer' | 'funding';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  /** null means an external source/destination (bank account or card). */
  senderId: string | null;
  receiverId: string | null;
  note?: string;
  status: TransactionStatus;
  createdAt: string;
}

const BALANCES_KEY = 'business_nexus_wallet_balances';
const TRANSACTIONS_KEY = 'business_nexus_wallet_transactions';

const seedBalances: Record<string, number> = {
  e1: 18500, e2: 9200, e3: 4750, e4: 12300,
  i1: 250000, i2: 480000, i3: 125000,
};

const seedTransactions: WalletTransaction[] = [
  {
    id: 'tx-seed-1',
    type: 'funding',
    amount: 25000,
    senderId: 'i2',
    receiverId: 'e1',
    note: 'Seed round — first tranche',
    status: 'completed',
    createdAt: subDays(new Date(), 9).toISOString(),
  },
  {
    id: 'tx-seed-2',
    type: 'deposit',
    amount: 50000,
    senderId: null,
    receiverId: 'i1',
    note: 'Bank transfer',
    status: 'completed',
    createdAt: subDays(new Date(), 7).toISOString(),
  },
  {
    id: 'tx-seed-3',
    type: 'transfer',
    amount: 1200,
    senderId: 'e1',
    receiverId: 'e2',
    note: 'Shared booth at TechCrunch',
    status: 'completed',
    createdAt: subDays(new Date(), 5).toISOString(),
  },
  {
    id: 'tx-seed-4',
    type: 'withdraw',
    amount: 3000,
    senderId: 'e1',
    receiverId: null,
    note: 'Withdrawal to bank ····6789',
    status: 'pending',
    createdAt: subDays(new Date(), 2).toISOString(),
  },
  {
    id: 'tx-seed-5',
    type: 'funding',
    amount: 10000,
    senderId: 'i1',
    receiverId: 'e3',
    note: 'HealthPulse bridge financing',
    status: 'failed',
    createdAt: subDays(new Date(), 1).toISOString(),
  },
];

const loadBalances = (): Record<string, number> => {
  try {
    const stored = localStorage.getItem(BALANCES_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* fall through to seed */ }
  localStorage.setItem(BALANCES_KEY, JSON.stringify(seedBalances));
  return { ...seedBalances };
};

const loadTransactions = (): WalletTransaction[] => {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* fall through to seed */ }
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(seedTransactions));
  return [...seedTransactions];
};

const saveBalances = (balances: Record<string, number>) =>
  localStorage.setItem(BALANCES_KEY, JSON.stringify(balances));

const saveTransactions = (transactions: WalletTransaction[]) =>
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));

export const getBalance = (userId: string): number => loadBalances()[userId] ?? 0;

export const getTransactionsForUser = (userId: string): WalletTransaction[] =>
  loadTransactions()
    .filter(tx => tx.senderId === userId || tx.receiverId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

const recordTransaction = (tx: Omit<WalletTransaction, 'id' | 'createdAt'>): WalletTransaction => {
  const transactions = loadTransactions();
  const full: WalletTransaction = {
    ...tx,
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    createdAt: new Date().toISOString(),
  };
  saveTransactions([full, ...transactions]);
  return full;
};

export const deposit = (userId: string, amount: number, note?: string): WalletTransaction => {
  const balances = loadBalances();
  balances[userId] = (balances[userId] ?? 0) + amount;
  saveBalances(balances);
  return recordTransaction({
    type: 'deposit', amount, senderId: null, receiverId: userId,
    note: note ?? 'Card deposit', status: 'completed',
  });
};

export const withdraw = (userId: string, amount: number, note?: string): WalletTransaction => {
  const balances = loadBalances();
  if ((balances[userId] ?? 0) < amount) {
    throw new Error('Insufficient balance for this withdrawal');
  }
  balances[userId] -= amount;
  saveBalances(balances);
  return recordTransaction({
    type: 'withdraw', amount, senderId: userId, receiverId: null,
    note: note ?? 'Withdrawal to bank account', status: 'completed',
  });
};

export const transfer = (
  senderId: string,
  receiverId: string,
  amount: number,
  note?: string,
  type: 'transfer' | 'funding' = 'transfer'
): WalletTransaction => {
  const balances = loadBalances();
  if ((balances[senderId] ?? 0) < amount) {
    throw new Error('Insufficient balance for this transfer');
  }
  balances[senderId] -= amount;
  balances[receiverId] = (balances[receiverId] ?? 0) + amount;
  saveBalances(balances);
  return recordTransaction({
    type, amount, senderId, receiverId, note, status: 'completed',
  });
};

export const fundDeal = (
  investorId: string,
  entrepreneurId: string,
  amount: number,
  dealName: string
): WalletTransaction => transfer(investorId, entrepreneurId, amount, dealName, 'funding');

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

export const describeCounterparty = (id: string | null): string => {
  if (id === null) return 'External (bank / card)';
  return findUserById(id)?.name ?? 'Unknown user';
};
