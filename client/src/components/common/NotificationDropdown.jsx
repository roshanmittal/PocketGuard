import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { formatDate } from '../../utils/formatters';
import { Bell, CheckCheck, Trash2, ArrowUpRight, ArrowDownLeft, MessageSquare, Sparkles } from 'lucide-react';

const NotificationDropdown = () => {
  const {
    notifications,
    unreadNotifCount,
    markNotificationsRead,
    refreshNotifications,
  } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && unreadNotifCount > 0) {
      markNotificationsRead();
    }
    setIsOpen(!isOpen);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'lending':
      case 'transaction':
        return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'repayment':
        return <ArrowDownLeft className="w-4 h-4 text-teal-500" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadNotifCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
            {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white">Notifications</h4>
              {unreadNotifCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  {unreadNotifCount} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markNotificationsRead}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 items-start ${
                    !notif.read ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {formatDate(notif.createdAt, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
