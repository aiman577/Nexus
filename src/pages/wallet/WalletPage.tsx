import React, { useMemo, useState } from 'react';
import {
  Wallet, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Rocket,
  CreditCard, Landmark, X, CheckCircle2, Lock, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { users, entrepreneurs } from '../../data/users';
import {
  WalletTransaction, TransactionStatus, getBalance, getTransactionsForUser,
  deposit, withdraw, transfer, fundDeal, formatCurrency, describeCounterparty
} from '../../data/wallet';

type Action = 'deposit' | 'withdraw' | 'transfer' | 'fund';
type ModalStep = 'form' | 'review' | 'processing' | 'success';

const statusVariant: Record<TransactionStatus, BadgeVariant> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

const actionMeta: Record<Action, { title: string; icon: React.ReactNode; cta: string }> = {
  deposit: { title: 'Deposit Funds', icon: <ArrowDownLeft size={20} />, cta: 'Deposit' },
  withdraw: { title: 'Withdraw Funds', icon: <ArrowUpRight size={20} />, cta: 'Withdraw' },
  transfer: { title: 'Transfer Money', icon: <ArrowLeftRight size={20} />, cta: 'Transfer' },
  fund: { title: 'Fund a Deal', icon: <Rocket size={20} />, cta: 'Review Investment' },
};

const formatCardNumber = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [refreshTick, setRefreshTick] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [step, setStep] = useState<ModalStep>('form');
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [note, setNote] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<WalletTransaction | null>(null);

  const balance = useMemo(
    () => (user ? getBalance(user.id) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );
  const transactions = useMemo(
    () => (user ? getTransactionsForUser(user.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, refreshTick]
  );

  if (!user) return null;

  const isInvestor = user.role === 'investor';
  const transferTargets = users.filter(u => u.id !== user.id);
  const fundTargets = entrepreneurs.filter(e => e.id !== user.id);

  const moneyIn = transactions
    .filter(tx => tx.receiverId === user.id && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const moneyOut = transactions
    .filter(tx => tx.senderId === user.id && tx.status === 'completed')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const openModal = (a: Action) => {
    setAction(a);
    setStep('form');
    setAmount('');
    setRecipientId('');
    setNote('');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setFormError(null);
  };

  const closeModal = () => {
    if (step === 'processing') return;
    setAction(null);
  };

  const validateForm = (): string | null => {
    const value = parseFloat(amount);
    if (!amount || isNaN(value) || value <= 0) return 'Enter a valid amount greater than zero';
    if (action !== 'deposit' && value > balance) return 'Amount exceeds your available balance';
    if (action === 'deposit') {
      if (cardNumber.replace(/\s/g, '').length !== 16) return 'Enter a valid 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Enter a valid expiry date (MM/YY)';
      if (!/^\d{3,4}$/.test(cvc)) return 'Enter a valid CVC';
    }
    if ((action === 'transfer' || action === 'fund') && !recipientId) {
      return action === 'fund' ? 'Select a startup to fund' : 'Select a recipient';
    }
    return null;
  };

  const executeAction = () => {
    if (!action) return;
    setStep('processing');
    const value = parseFloat(amount);
    // Simulated gateway latency.
    setTimeout(() => {
      try {
        let tx: WalletTransaction;
        if (action === 'deposit') {
          tx = deposit(user.id, value, `Card deposit ····${cardNumber.replace(/\s/g, '').slice(-4)}`);
        } else if (action === 'withdraw') {
          tx = withdraw(user.id, value, note || 'Withdrawal to bank account');
        } else if (action === 'transfer') {
          tx = transfer(user.id, recipientId, value, note || undefined);
        } else {
          const target = fundTargets.find(e => e.id === recipientId);
          tx = fundDeal(user.id, recipientId, value, note || `Investment in ${target?.startupName ?? 'startup'}`);
        }
        setLastTx(tx);
        setStep('success');
        setRefreshTick(t => t + 1);
        toast.success(`${actionMeta[action].title} completed`);
      } catch (err) {
        setFormError((err as Error).message);
        setStep('form');
        toast.error((err as Error).message);
      }
    }, 1400);
  };

  const handleContinue = () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    if (action === 'fund' && step === 'form') {
      setStep('review');
      return;
    }
    executeAction();
  };

  const platformFee = action === 'fund' ? Math.round(parseFloat(amount || '0') * 0.015 * 100) / 100 : 0;
  const fundTarget = fundTargets.find(e => e.id === recipientId);

  const txDirection = (tx: WalletTransaction): 'in' | 'out' =>
    tx.receiverId === user.id ? 'in' : 'out';

  const actions: { key: Action; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'deposit', label: 'Deposit', icon: <ArrowDownLeft size={18} />, show: true },
    { key: 'withdraw', label: 'Withdraw', icon: <ArrowUpRight size={18} />, show: true },
    { key: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={18} />, show: true },
    { key: 'fund', label: 'Fund a Deal', icon: <Rocket size={18} />, show: isInvestor },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet & Payments</h1>
        <p className="text-gray-600">Manage your balance, payments, and deal funding</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance card */}
        <div className="lg:col-span-2">
          <div
            data-tour="wallet-balance"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 text-white p-6 shadow-lg"
          >
            <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-100">
                  <Wallet size={18} />
                  <span className="text-sm font-medium">Available balance</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-primary-100">
                  <ShieldCheck size={14} /> Secured · Simulation
                </span>
              </div>
              <p className="mt-3 text-4xl font-bold tracking-tight">{formatCurrency(balance)}</p>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-xs text-primary-200 uppercase tracking-wider">Account holder</p>
                  <p className="text-sm font-medium mt-0.5">{user.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-200 uppercase tracking-wider">Nexus Pay</p>
                  <p className="text-sm font-mono mt-0.5">···· ···· ···· 4242</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3" data-tour="wallet-actions">
            {actions.filter(a => a.show).map(a => (
              <button
                key={a.key}
                onClick={() => openModal(a.key)}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white py-4 px-2 hover:border-primary-400 hover:bg-primary-50 transition-colors duration-200"
              >
                <span className="p-2.5 rounded-full bg-primary-50 text-primary-600">{a.icon}</span>
                <span className="text-sm font-medium text-gray-800">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Money in / out summary */}
        <div className="space-y-4">
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-success-50 text-success-700">
                <ArrowDownLeft size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Money in</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(moneyIn)}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-error-50 text-error-700">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Money out</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(moneyOut)}</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-center gap-3 text-sm text-gray-600">
              <Lock size={16} className="text-gray-400 shrink-0" />
              All payments are simulated for demo purposes — no real money moves.
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Transaction history */}
      <Card data-tour="wallet-history">
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Transaction History</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Description', 'Sender', 'Receiver', 'Amount', 'Status'].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                      No transactions yet — make your first deposit to get started
                    </td>
                  </tr>
                )}
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(parseISO(tx.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="capitalize font-medium">{tx.type}</span>
                      {tx.note && <span className="text-gray-500"> — {tx.note}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.senderId === user.id ? 'You' : describeCounterparty(tx.senderId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tx.receiverId === user.id ? 'You' : describeCounterparty(tx.receiverId)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                        txDirection(tx) === 'in' ? 'text-success-700' : 'text-gray-900'
                      }`}
                    >
                      {txDirection(tx) === 'in' ? '+' : '−'}{formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusVariant[tx.status]} size="sm" rounded>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Payment modal */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-slide-in">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-full bg-primary-50 text-primary-600">
                  {actionMeta[action].icon}
                </span>
                <h3 className="text-lg font-medium text-gray-900">{actionMeta[action].title}</h3>
              </div>
              {step !== 'processing' && (
                <button
                  onClick={closeModal}
                  aria-label="Close"
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="px-6 py-5">
              {step === 'form' && (
                <div className="space-y-4">
                  {formError && (
                    <div className="bg-error-50 border border-error-500 text-error-700 px-3 py-2 rounded-md text-sm">
                      {formError}
                    </div>
                  )}

                  {(action === 'transfer' || action === 'fund') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {action === 'fund' ? 'Startup to fund' : 'Recipient'}
                      </label>
                      <select
                        value={recipientId}
                        onChange={e => setRecipientId(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      >
                        <option value="">Select…</option>
                        {(action === 'fund' ? fundTargets : transferTargets).map(t => (
                          <option key={t.id} value={t.id}>
                            {action === 'fund' && 'startupName' in t
                              ? `${(t as typeof fundTargets[number]).startupName} (${t.name})`
                              : `${t.name} · ${t.role}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Input
                    label="Amount (USD)"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    fullWidth
                    startAdornment={<span className="text-gray-500">$</span>}
                    helperText={action !== 'deposit' ? `Available: ${formatCurrency(balance)}` : undefined}
                  />

                  {action === 'deposit' && (
                    <div className="space-y-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                      <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CreditCard size={16} /> Card details
                      </p>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                        fullWidth
                        inputMode="numeric"
                        aria-label="Card number"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={e => setExpiry(formatExpiry(e.target.value))}
                          fullWidth
                          inputMode="numeric"
                          aria-label="Expiry date"
                        />
                        <Input
                          placeholder="CVC"
                          value={cvc}
                          onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          fullWidth
                          inputMode="numeric"
                          aria-label="CVC"
                        />
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Lock size={12} /> Card details are mock inputs — nothing is charged or stored.
                      </p>
                    </div>
                  )}

                  {action === 'withdraw' && (
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                      <Landmark size={20} className="text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Chase Bank ····6789</p>
                        <p className="text-xs text-gray-500">Arrives in 1–2 business days</p>
                      </div>
                    </div>
                  )}

                  {(action === 'transfer' || action === 'fund' || action === 'withdraw') && (
                    <Input
                      label="Note (optional)"
                      placeholder={action === 'fund' ? 'e.g. Series A participation' : 'What is this for?'}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      fullWidth
                    />
                  )}

                  <Button fullWidth onClick={handleContinue}>
                    {actionMeta[action].cta}
                  </Button>
                </div>
              )}

              {step === 'review' && action === 'fund' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 text-sm">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-gray-600">Startup</span>
                      <span className="font-medium text-gray-900">{fundTarget?.startupName}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-gray-600">Founder</span>
                      <span className="font-medium text-gray-900">{fundTarget?.name}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-gray-600">Investment amount</span>
                      <span className="font-medium text-gray-900">{formatCurrency(parseFloat(amount))}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-gray-600">Platform fee (1.5%)</span>
                      <span className="font-medium text-gray-900">{formatCurrency(platformFee)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3 bg-gray-50">
                      <span className="font-semibold text-gray-900">Founder receives</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(parseFloat(amount) - platformFee)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Funds move from your Nexus wallet to {fundTarget?.name}'s wallet instantly. This is a
                    simulated escrow flow for demo purposes.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={() => setStep('form')}>
                      Back
                    </Button>
                    <Button fullWidth leftIcon={<Rocket size={16} />} onClick={executeAction}>
                      Confirm & Fund
                    </Button>
                  </div>
                </div>
              )}

              {step === 'processing' && (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
                  <p className="mt-4 text-sm font-medium text-gray-900">Processing payment…</p>
                  <p className="text-xs text-gray-500 mt-1">Contacting payment gateway (simulated)</p>
                </div>
              )}

              {step === 'success' && lastTx && (
                <div className="py-6 flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-full bg-success-50 flex items-center justify-center">
                    <CheckCircle2 size={30} className="text-success-700" />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-gray-900">
                    {formatCurrency(lastTx.amount)} {lastTx.type === 'deposit' ? 'added' : 'sent'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {lastTx.note ?? actionMeta[action].title} · Ref {lastTx.id.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-600 mt-3">
                    New balance: <span className="font-semibold">{formatCurrency(balance)}</span>
                  </p>
                  <Button className="mt-5" fullWidth onClick={() => setAction(null)}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
