import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { lendingService } from '../services/lendingService';
import { useSocket } from '../context/SocketContext';
import LendingSummaryCards from '../components/lending/LendingSummaryCards';
import ContactLendingCard from '../components/lending/ContactLendingCard';
import { Plus, Users, Search, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const LendingPage = () => {
  const { openAddModal, openRepayModal } = useOutletContext();
  const { subscribeToFinancialUpdates } = useSocket();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totals: {}, contacts: [] });
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'owes_you' | 'you_owe' | 'settled'
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLendingData = async () => {
    try {
      const res = await lendingService.getDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching lending dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLendingData();

    // Subscribe to live socket updates
    const unsubscribe = subscribeToFinancialUpdates(() => {
      fetchLendingData();
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLendingData();
  };

  const filteredContacts = (data.contacts || []).filter((contact) => {
    if (filterTab !== 'all' && contact.status !== filterTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = contact.counterparty?.name?.toLowerCase() || '';
      const mobile = contact.counterparty?.mobile || '';
      return name.includes(q) || mobile.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Lending & Borrowing Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Two-sided synchronized ledger for money you lent, borrowed, or settled
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all ${
              refreshing ? 'animate-spin' : ''
            }`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => openAddModal('lend')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Give Money
          </button>

          <button
            onClick={() => openAddModal('borrow')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Receive Money
          </button>
        </div>
      </div>

      {/* 4 Core Summary Cards */}
      <LendingSummaryCards totals={data.totals} />

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto p-1 text-xs font-semibold">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterTab === 'all'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Contacts ({data.contacts?.length || 0})
          </button>
          <button
            onClick={() => setFilterTab('owes_you')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterTab === 'owes_you'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Owes You
          </button>
          <button
            onClick={() => setFilterTab('you_owe')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterTab === 'you_owe'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            You Owe
          </button>
          <button
            onClick={() => setFilterTab('settled')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filterTab === 'settled'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Settled (₹0)
          </button>
        </div>

        <div className="relative w-full sm:w-64 px-1">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Contacts Lending Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading lending contacts...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-slate-400 opacity-40" />
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            No contacts match your criteria
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Click "Give Money" or "Receive Money" to record a new financial relationship.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => (
            <ContactLendingCard
              key={contact._id}
              contact={contact}
              onGiveMoney={(c) => openAddModal('lend', c.counterparty)}
              onReceiveMoney={(c) => openAddModal('borrow', c.counterparty)}
              onRepay={() => openRepayModal(contact)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LendingPage;
