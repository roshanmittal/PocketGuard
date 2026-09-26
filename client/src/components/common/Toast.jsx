import React, { useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Bell, X } from 'lucide-react';

const Toast = () => {
  const { latestToast, dismissToast } = useSocket();

  useEffect(() => {
    if (latestToast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [latestToast]);

  if (!latestToast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 transition-all duration-300 ease-out transform translate-y-0 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
        <Bell className="w-5 h-5 animate-bounce" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {latestToast.title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
          {latestToast.message}
        </p>
      </div>
      <button
        onClick={dismissToast}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
