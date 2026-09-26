import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { transactionService } from '../../services/transactionService';
import { lendingService } from '../../services/lendingService';
import { authService } from '../../services/authService';
import { ArrowDownLeft, ArrowUpRight, HandCoins, Users, Search, CheckCircle2 } from 'lucide-react';

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: [
    'Food',
    'Groceries',
    'Transport',
    'Bills',
    'Shopping',
    'Entertainment',
    'Health',
    'Education',
    'Other',
  ],
};

const AddTransactionModal = ({ isOpen, onClose, onSuccess, initialType = 'income', prefillContact = null }) => {
  const [activeTab, setActiveTab] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // For lending / borrowing
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(prefillContact);
  const [isManualContact, setIsManualContact] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualMobile, setManualMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialType) {
      setActiveTab(initialType);
      if (initialType === 'income') setCategory('Salary');
      else if (initialType === 'expense') setCategory('Food');
    }
    if (prefillContact) {
      setSelectedUser(prefillContact);
    }
  }, [initialType, prefillContact, isOpen]);

  // Search registered users
  useEffect(() => {
    const fetchUsers = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await authService.searchUsers(searchQuery.trim());
          if (res.success) {
            setSearchResults(res.data);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setSearchResults([]);
      }
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'income' || activeTab === 'expense') {
        const payload = {
          type: activeTab,
          amount: numAmount,
          category,
          description: description.trim(),
          date,
        };
        const res = await transactionService.createTransaction(payload);
        if (res.success) {
          resetForm();
          onSuccess && onSuccess(res.data);
          onClose();
        }
      } else {
        // Lending / Borrowing / Repayment
        const payload = {
          type: activeTab,
          amount: numAmount,
          description: description.trim(),
          date,
        };

        if (selectedUser) {
          payload.contactId = selectedUser.id || selectedUser._id;
          payload.contactMobile = selectedUser.mobile;
        } else if (isManualContact || manualName || manualMobile) {
          payload.contactName = manualName.trim();
          payload.contactMobile = manualMobile.trim();
        } else {
          setError('Please select a registered contact or enter person details');
          setLoading(false);
          return;
        }

        const res = await lendingService.createTransaction(payload);
        if (res.success) {
          resetForm();
          onSuccess && onSuccess(res.data);
          onClose();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Transaction recording failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setIsManualContact(false);
    setManualName('');
    setManualMobile('');
    setError('');
  };

  const isLendingType = ['lend', 'borrow', 'repayment'].includes(activeTab);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Transaction" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('income');
              setCategory('Salary');
            }}
            className={`py-2 px-2 rounded-lg transition-all text-center ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('expense');
              setCategory('Food');
            }}
            className={`py-2 px-2 rounded-lg transition-all text-center ${
              activeTab === 'expense'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lend')}
            className={`py-2 px-2 rounded-lg transition-all text-center ${
              activeTab === 'lend'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Money Given
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('borrow')}
            className={`py-2 px-2 rounded-lg transition-all text-center ${
              activeTab === 'borrow'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Received
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('repayment')}
            className={`py-2 px-2 rounded-lg transition-all text-center col-span-3 sm:col-span-1 ${
              activeTab === 'repayment'
                ? 'bg-teal-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Repay
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        {/* Counterparty selection if lending/borrowing/repayment */}
        {isLendingType && (
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {activeTab === 'lend'
                  ? 'Person you gave money to'
                  : activeTab === 'borrow'
                  ? 'Person who gave you money'
                  : 'Counterparty (Repayment)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsManualContact(!isManualContact);
                  setSelectedUser(null);
                }}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                {isManualContact ? 'Search Registered User' : '+ External Person'}
              </button>
            </div>

            {selectedUser ? (
              <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-300 dark:border-emerald-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {selectedUser.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {selectedUser.mobile}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-rose-500 hover:underline font-semibold"
                >
                  Change
                </button>
              </div>
            ) : isManualContact ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Person's Full Name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Mobile Number (Optional)"
                    value={manualMobile}
                    onChange={(e) => setManualMobile(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search registered user by name or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-20 divide-y divide-slate-100 dark:divide-slate-700">
                    {searchResults.map((u) => (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {u.name}
                          </p>
                          <p className="text-[10px] text-slate-500">{u.mobile}</p>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">Select</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-lg font-bold text-slate-400">
              ₹
            </span>
            <input
              type="number"
              required
              min="0.01"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Category (for personal income/expense) */}
        {!isLendingType && (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              {(CATEGORIES[activeTab] || CATEGORIES.expense).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder={
              isLendingType
                ? 'Reason (e.g. Lunch bill, Trip advance)'
                : 'Description (e.g. Client work, Dinner)'
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all"
          >
            {loading ? 'Recording...' : 'Confirm Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTransactionModal;
