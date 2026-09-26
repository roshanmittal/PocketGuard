import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

const FinancialSummaryBar = ({ financialRelationship, onGiveMoney, onReceiveMoney, onRepay }) => {
  if (!financialRelationship) {
    return (
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
        <span>No lending transactions recorded with this user yet.</span>
        <button
          onClick={onGiveMoney}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
        >
          + Record First Transaction
        </button>
      </div>
    );
  }

  const { counterparty, netBalance, totalGiven, totalReceived, status } = financialRelationship;
  const name = counterparty?.name || 'User';
  const absRemaining = Math.abs(netBalance);

  let statusText = 'All Settled (₹0)';
  let statusColor = 'text-slate-500';

  if (status === 'owes_you') {
    statusText = `${name} owes you ${formatCurrency(absRemaining)}`;
    statusColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (status === 'you_owe') {
    statusText = `You owe ${name} ${formatCurrency(absRemaining)}`;
    statusColor = 'text-rose-600 dark:text-rose-400';
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-slate-50 dark:via-slate-900 to-teal-500/10 border-y border-emerald-200/60 dark:border-emerald-800/40 p-3 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Financial Summary Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Synchronized Financial Balance
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              <ShieldCheck className="w-3 h-3" /> Live Synced
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-600 dark:text-slate-300">
              You gave: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(totalGiven)}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300">
              {name} returned: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(totalReceived)}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className={`font-bold font-mono ${statusColor}`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Quick Transaction Action Buttons directly in chat */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={onGiveMoney}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            + Give Money
          </button>
          <button
            onClick={onReceiveMoney}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Receive Money
          </button>
          {status !== 'settled' && (
            <button
              onClick={onRepay}
              className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Settle Up
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryBar;
