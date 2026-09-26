import React, { useState } from 'react';
import Modal from '../common/Modal';
import { lendingService } from '../../services/lendingService';
import { formatCurrency } from '../../utils/formatters';

const RepayModal = ({ isOpen, onClose, relationship, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Repayment');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!relationship) return null;

  const outstanding = Math.abs(relationship.netBalance);
  const counterpartyName = relationship.counterparty?.name || 'Contact';

  const handleQuickFill = () => {
    setAmount(outstanding.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid repayment amount');
      return;
    }

    setLoading(true);
    try {
      const res = await lendingService.repay(relationship._id, {
        amount: numAmount,
        description: description.trim(),
      });

      if (res.success) {
        setAmount('');
        onSuccess && onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Repayment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Settle / Repay with ${counterpartyName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Current Outstanding:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatCurrency(outstanding)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-slate-500">Status:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
              {relationship.status === 'owes_you'
                ? `${counterpartyName} owes you`
                : `You owe ${counterpartyName}`}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Repayment Amount (₹)
            </label>
            {outstanding > 0 && (
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Pay Full ({formatCurrency(outstanding)})
              </button>
            )}
          </div>
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

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Note / Payment Mode
          </label>
          <input
            type="text"
            placeholder="e.g. Returned via UPI / Cash"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-teal-600/25 transition-all"
        >
          {loading ? 'Processing Repayment...' : 'Confirm Repayment'}
        </button>
      </form>
    </Modal>
  );
};

export default RepayModal;
