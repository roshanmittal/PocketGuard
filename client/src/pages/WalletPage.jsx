import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { walletService } from '../services/walletService';
import { transactionService } from '../services/transactionService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import {
  Wallet,
  Plus,
  Minus,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Sparkles,
} from 'lucide-react';

const WalletPage = () => {
  const { user } = useAuth();
  const { openAddModal } = useOutletContext();
  const { subscribeToFinancialUpdates } = useSocket();

  const [currentBalance, setCurrentBalance] = useState(user?.walletBalance || 0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAction, setAdjustAction] = useState('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const fetchWalletData = async () => {
    try {
      const [dashRes, txRes] = await Promise.all([
        walletService.getDashboard(),
        transactionService.getTransactions({ limit: 50 }),
      ]);

      if (dashRes.success && dashRes.data.wallet) {
        setCurrentBalance(dashRes.data.wallet.currentBalance);
      }

      if (txRes.success && txRes.data.transactions) {
        // Filter transactions for personal wallet (income/expense/manual)
        setTransactions(txRes.data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();

    const unsubscribe = subscribeToFinancialUpdates(() => {
      fetchWalletData();
    });

    return () => unsubscribe();
  }, []);

  const handleQuickAdd = async (amount) => {
    try {
      const res = await walletService.adjustBalance({
        amount,
        action: 'add',
        description: `Quick cash add (+${formatCurrency(amount)})`,
      });
      if (res.success) {
        setCurrentBalance(res.data.walletBalance);
        fetchWalletData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const num = Number(adjustAmount);
    if (isNaN(num) || (adjustAction !== 'set' && num <= 0)) {
      alert('Please enter a valid amount');
      return;
    }

    setAdjustLoading(true);
    try {
      const res = await walletService.adjustBalance({
        amount: num,
        action: adjustAction,
        description: adjustNote || `Manual wallet ${adjustAction}`,
      });
      if (res.success) {
        setCurrentBalance(res.data.walletBalance);
        setIsAdjustModalOpen(false);
        setAdjustAmount('');
        setAdjustNote('');
        fetchWalletData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Personal Wallet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal capital, daily income, expenses, and manual balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Adjust Balance
          </button>

          <button
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Income
          </button>

          <button
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all"
          >
            <Minus className="w-4 h-4 stroke-[3]" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Hero Wallet Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xl shadow-emerald-700/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2">
              <Wallet className="w-4 h-4" />
              <span>Available Wallet Balance</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono">
              {formatCurrency(currentBalance)}
            </h2>
            <p className="text-xs text-emerald-100/80 mt-2">
              Updated automatically across personal transactions and lending settlements
            </p>
          </div>

          {/* Quick Add Pills */}
          <div className="bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Quick Add Funds
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickAdd(500)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold font-mono transition-colors"
              >
                +₹500
              </button>
              <button
                onClick={() => handleQuickAdd(1000)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold font-mono transition-colors"
              >
                +₹1,000
              </button>
              <button
                onClick={() => handleQuickAdd(5000)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold font-mono transition-colors"
              >
                +₹5,000
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History in Wallet */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Wallet History
            </h3>
            <p className="text-xs text-slate-400">All capital inflows and outflows</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No wallet transactions found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {transactions.map((tx) => {
              const isIncomeLike =
                tx.type === 'income' ||
                tx.type === 'borrow' ||
                tx.displayType === 'Repayment Received';

              return (
                <div
                  key={tx._id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isIncomeLike
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                      }`}
                    >
                      {isIncomeLike ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {tx.description || tx.category}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{tx.counterpartyName || tx.category}</span>
                        <span>•</span>
                        <span>{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-mono font-bold text-sm ${
                        isIncomeLike
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isIncomeLike ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <Badge variant={tx.type} className="mt-0.5">
                      {tx.displayType || tx.type}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Balance Adjust Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Balance Adjustment"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAdjustAction('add')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                adjustAction === 'add'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              + Add
            </button>
            <button
              type="button"
              onClick={() => setAdjustAction('subtract')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                adjustAction === 'subtract'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              - Subtract
            </button>
            <button
              type="button"
              onClick={() => setAdjustAction('set')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                adjustAction === 'set'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              = Set Exact
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              required
              min="0"
              step="any"
              placeholder="0.00"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Bank reconcile, Cash found"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={adjustLoading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all"
          >
            {adjustLoading ? 'Updating...' : 'Confirm Balance Adjustment'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default WalletPage;
