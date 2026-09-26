import React from 'react';
import { formatTime } from '../../utils/formatters';
import { Check, CheckCheck, ArrowRightLeft } from 'lucide-react';

const MessageBubble = ({ message, isMe }) => {
  const isAlert = message.type === 'transaction_alert';

  if (isAlert) {
    return (
      <div className="flex justify-center my-3">
        <div className="max-w-md px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Synchronized Financial Event</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
            {message.message}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col mb-3 ${isMe ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words ${
          isMe
            ? 'bg-emerald-600 text-white rounded-br-xs'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/80'
        }`}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.message}</p>
        <div
          className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
            isMe ? 'text-emerald-200' : 'text-slate-400'
          }`}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isMe && (
            message.read ? (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
