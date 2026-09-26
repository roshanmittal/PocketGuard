import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { walletService } from '../services/walletService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/dashboard/StatCard';
import CashFlowChart from '../components/dashboard/CashFlowChart';
import CategoryChart from '../components/dashboard/CategoryChart';
import RecentTransactionsTable from '../components/dashboard/RecentTransactionsTable';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { openAddModal } = useOutletContext();
  const { subscribeToFinancialUpdates } = useSocket();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await walletService.getDashboard();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Subscribe to real-time financial updates from Socket.IO
    const unsubscribe = subscribeToFinancialUpdates(() => {
      fetchDashboard();
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  const {
    wallet = { currentBalance: 0 },
    thisMonth = { income: 0, expenses: 0, net: 0 },
    lending = { totalReceivable: 0, totalPayable: 0 },
    categoryBreakdown = [],
    cashFlowHistory = [],
    recentTransactions = [],
  } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time balance, synchronized money lending, and monthly cash flow
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all ${
              refreshing ? 'animate-spin' : ''
            }`}
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/ai"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs sm:text-sm border border-purple-200 dark:border-purple-800 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            AI Insights
          </Link>

          <button
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Core Financial Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Wallet Balance"
          amount={wallet.currentBalance}
          subtitle="Available in personal wallet"
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title="Monthly Income"
          amount={thisMonth.income}
          subtitle={`Net Savings: ₹${thisMonth.net.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          color="emerald"
        />

        <StatCard
          title="Monthly Expenses"
          amount={thisMonth.expenses}
          subtitle="Total spent this month"
          icon={TrendingDown}
          color="rose"
        />

        <StatCard
          title="You Will Receive"
          amount={lending.totalReceivable}
          subtitle={`You owe others: ₹${lending.totalPayable.toLocaleString('en-IN')}`}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Quick Flow Action Buttons */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Quick Actions:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openAddModal('income')}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-100 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Income
          </button>

          <button
            onClick={() => openAddModal('expense')}
            className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold text-xs hover:bg-rose-100 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Expense
          </button>

          <button
            onClick={() => openAddModal('lend')}
            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold text-xs hover:bg-amber-100 transition-colors flex items-center gap-1"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Give Money
          </button>

          <button
            onClick={() => openAddModal('borrow')}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 transition-colors flex items-center gap-1"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Receive Money
          </button>

          <button
            onClick={() => openAddModal('repayment')}
            className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold text-xs hover:bg-teal-100 transition-colors flex items-center gap-1"
          >
            Repayment
          </button>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow History */}
        <div className="lg:col-span-2 rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Monthly Cash Flow
              </h3>
              <p className="text-xs text-slate-400">Income vs Expenses (Last 6 Months)</p>
            </div>
          </div>
          <CashFlowChart data={cashFlowHistory} />
        </div>

        {/* Category Breakdown */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Spending by Category
            </h3>
            <p className="text-xs text-slate-400">This Month's Outflow</p>
          </div>
          <CategoryChart data={categoryBreakdown} />
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h3>
            <p className="text-xs text-slate-400">Latest personal & lending activity</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View All →
          </Link>
        </div>

        <RecentTransactionsTable
          transactions={recentTransactions}
          currentUserId={user?._id}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
