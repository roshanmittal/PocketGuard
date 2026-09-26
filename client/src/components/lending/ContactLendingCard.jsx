import React from 'react';
import { formatCurrency, getInitials } from '../../utils/formatters';
import Badge from '../common/Badge';
import { MessageSquare, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactLendingCard = ({ contact, onGiveMoney, onReceiveMoney, onRepay }) => {
  const navigate = useNavigate();
  const { counterparty, netBalance, totalGiven, totalReceived, status } = contact;

  const isOwed = status === 'owes_you';
  const owes = status === 'you_owe';
  const isSettled = status === 'settled';

  const handleStartChat = () => {
    if (counterparty.isExternal) {
      alert('This is an external contact. Live chat is available with registered PocketGuard users.');
      return;
    }
    navigate(`/chat?userId=${counterparty.id}`);
  };

  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
                {counterparty.profileImage ? (
                  <img
                    src={counterparty.profileImage}
                    alt={counterparty.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(counterparty.name)
                )}
              </div>
              {!counterparty.isExternal && (
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-800"
                  title="Registered PocketGuard User"
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {counterparty.name}
                </h4>
                {counterparty.isExternal && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">
                    Ext
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {counterparty.mobile || 'No mobile listed'}
              </p>
            </div>
          </div>

          <Badge variant={status}>
            {isOwed ? 'Owes You' : owes ? 'You Owe' : 'Settled'}
          </Badge>
        </div>

        {/* Net Status Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isOwed
              ? `${counterparty.name} owes you`
              : owes
              ? `You owe ${counterparty.name}`
              : 'Status'}
          </span>
          <span
            className={`font-mono font-extrabold text-sm ${
              isOwed
                ? 'text-emerald-600 dark:text-emerald-400'
                : owes
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-400'
            }`}
          >
            {isSettled ? 'Settled (₹0)' : formatCurrency(Math.abs(netBalance))}
          </span>
        </div>

        {/* Breakdown details */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-400 block">You gave</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(totalGiven)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-400 block">Received back</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(totalReceived)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
        <button
          onClick={() => onGiveMoney(contact)}
          className="flex-1 py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Give
        </button>

        <button
          onClick={() => onReceiveMoney(contact)}
          className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors flex items-center justify-center gap-1"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          Receive
        </button>

        {!isSettled && (
          <button
            onClick={() => onRepay(contact)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Settle
          </button>
        )}

        {!counterparty.isExternal && (
          <button
            onClick={handleStartChat}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs transition-colors"
            title="Chat with contact"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ContactLendingCard;
