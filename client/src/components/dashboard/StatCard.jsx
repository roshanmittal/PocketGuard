import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const StatCard = ({ title, amount, subtitle, icon: Icon, color = 'emerald' }) => {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      border: 'border-emerald-200/80 dark:border-emerald-800/50',
      iconBg: 'bg-emerald-500 text-white shadow-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    rose: {
      bg: 'bg-rose-50/70 dark:bg-rose-950/30',
      border: 'border-rose-200/80 dark:border-rose-800/50',
      iconBg: 'bg-rose-500 text-white shadow-rose-500/20',
      text: 'text-rose-700 dark:text-rose-400',
    },
    indigo: {
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      border: 'border-indigo-200/80 dark:border-indigo-800/50',
      iconBg: 'bg-indigo-500 text-white shadow-indigo-500/20',
      text: 'text-indigo-700 dark:text-indigo-400',
    },
    amber: {
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      border: 'border-amber-200/80 dark:border-amber-800/50',
      iconBg: 'bg-amber-500 text-white shadow-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      className={`rounded-2xl p-5 border ${scheme.bg} ${scheme.border} transition-all duration-200 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {formatCurrency(amount)}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
