import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Receipt,
  MessageSquare,
  Sparkles,
  User,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Wallet', path: '/wallet', icon: Wallet },
  { name: 'Lending & Debt', path: '/lending', icon: Users },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Live Chat', path: '/chat', icon: MessageSquare, hasBadge: true },
  { name: 'AI Financial Intelligence', path: '/ai', icon: Sparkles, highlight: true },
  { name: 'Profile', path: '/profile', icon: User },
];

const Sidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 p-4 shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
          Menu
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : item.highlight
                    ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive
                        ? 'text-white'
                        : item.highlight
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    }`}
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.highlight && !isActive && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      AI
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Synchronized security guarantee card */}
      <div className="mt-auto pt-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Two-Sided Sync Active
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            All lending and repayments are mirrored in real time with counterparties.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
