import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../common/Badge';
import { ArrowDownLeft, ArrowUpRight, HandCoins, Receipt } from 'lucide-react';

const RecentTransactionsTable = ({ transactions = [], currentUserId }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
        No transactions recorded yet
      </div>
    );
  }

  const getTypeIcon = (type, isSender) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
      case 'expense':
        return <ArrowUpRight className="w-4 h-4 text-rose-500" />;
      case 'lend':
        return <ArrowUpRight className="w-4 h-4 text-amber-500" />;
      case 'borrow':
        return <ArrowDownLeft className="w-4 h-4 text-indigo-500" />;
      case 'repayment':
        return isSender ? (
          <ArrowUpRight className="w-4 h-4 text-teal-500" />
        ) : (
          <ArrowDownLeft className="w-4 h-4 text-teal-500" />
        );
      default:
        return <HandCoins className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <th className="py-3 px-3">Type</th>
            <th className="py-3 px-3">Description</th>
            <th className="py-3 px-3">Party / Category</th>
            <th className="py-3 px-3">Date</th>
            <th className="py-3 px-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {transactions.map((tx) => {
            const isSender = tx.sender && tx.sender._id
              ? tx.sender._id.toString() === currentUserId?.toString()
              : tx.sender?.toString() === currentUserId?.toString();

            const isIncomeLike =
              tx.type === 'income' ||
              tx.type === 'borrow' ||
              (tx.type === 'repayment' && !isSender);

            const displaySign = isIncomeLike ? '+' : '-';
            const amountColor = isIncomeLike
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-900 dark:text-white';

            let partyOrCategory = tx.category;
            if (tx.isExternal && tx.externalContact?.name) {
              partyOrCategory = `${tx.externalContact.name} (Ext)`;
            } else if (tx.type === 'lend' || tx.type === 'borrow' || tx.type === 'repayment') {
              partyOrCategory = isSender
                ? tx.receiver?.name || 'Contact'
                : tx.sender?.name || 'Contact';
            }

            return (
              <tr
                key={tx._id}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(tx.type, isSender)}
                    </div>
                    <Badge variant={tx.type}>
                      {tx.type === 'lend'
                        ? 'Given'
                        : tx.type === 'borrow'
                        ? 'Received'
                        : tx.type}
                    </Badge>
                  </div>
                </td>
                <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                  {tx.description || tx.category}
                </td>
                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                  {partyOrCategory}
                </td>
                <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${amountColor}`}>
                  {displaySign}
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RecentTransactionsTable;
