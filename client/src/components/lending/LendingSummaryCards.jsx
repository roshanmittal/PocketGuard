import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownLeft, Users, AlertCircle } from 'lucide-react';

const LendingSummaryCards = ({ totals }) => {
  const {
    totalMoneyGiven = 0,
    totalMoneyReceived = 0,
    peopleWhoOweYou = 0,
    peopleYouOwe = 0,
  } = totals || {};

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* People Who Owe You */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300 dark:border-emerald-800/60">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <span>People Who Owe You</span>
          <Users className="w-5 h-5 text-emerald-500" />
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
          {formatCurrency(peopleWhoOweYou)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Pending to be collected</p>
      </div>

      {/* People You Owe */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-300 dark:border-rose-800/60">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
          <span>People You Owe</span>
          <AlertCircle className="w-5 h-5 text-rose-500" />
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
          {formatCurrency(peopleYouOwe)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Pending payments you owe</p>
      </div>

      {/* Total Money Given */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>Total Money Given</span>
          <ArrowUpRight className="w-5 h-5 text-amber-500" />
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
          {formatCurrency(totalMoneyGiven)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Total lifetime amount lent</p>
      </div>

      {/* Total Money Received */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>Total Received Back</span>
          <ArrowDownLeft className="w-5 h-5 text-teal-500" />
        </div>
        <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
          {formatCurrency(totalMoneyReceived)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">Total returned by borrowers</p>
      </div>
    </div>
  );
};

export default LendingSummaryCards;
