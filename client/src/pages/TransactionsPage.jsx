import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { transactionService } from '../services/transactionService';
import { useSocket } from '../context/SocketContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Badge from '../components/common/Badge';
import {
  Search,
  Filter,
  Trash2,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Salary',
  'Freelance',
  'Food',
  'Groceries',
  'Bills',
  'Shopping',
  'Transport',
  'Lending',
  'Borrowing',
  'Repayment',
  'Other',
];

const TransactionsPage = () => {
  const { openAddModal } = useOutletContext();
  const { subscribeToFinancialUpdates } = useSocket();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        type: typeFilter,
        category: categoryFilter === 'All' ? undefined : categoryFilter,
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortOrder,
        limit: 100,
      };

      const res = await transactionService.getTransactions(params);
      if (res.success) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const unsubscribe = subscribeToFinancialUpdates(() => {
      fetchTransactions();
    });

    return () => unsubscribe();
  }, [typeFilter, categoryFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await transactionService.deleteTransaction(id);
      if (res.success) {
        setTransactions((prev) => prev.filter((t) => t._id !== id));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit and filter all personal, lending, and repayment records
          </p>
        </div>

        <button
          onClick={() => openAddModal('income')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Record Transaction
        </button>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, person, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Types:</span>
          </div>

          {[
            { id: 'all', label: 'All' },
            { id: 'income', label: 'Income' },
            { id: 'expense', label: 'Expense' },
            { id: 'lend', label: 'Money Given' },
            { id: 'borrow', label: 'Money Received' },
            { id: 'repayment', label: 'Repayment' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                typeFilter === t.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400 text-xs">Sort:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No transactions match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category / Contact</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {transactions.map((tx) => {
                  const isPositive =
                    tx.type === 'income' ||
                    tx.type === 'borrow' ||
                    tx.displayType === 'Repayment Received';

                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant={tx.type}>{tx.displayType || tx.type}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {tx.description || tx.category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {tx.counterpartyName || tx.category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {tx.isCreator && (
                          <button
                            onClick={() => handleDelete(tx._id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
