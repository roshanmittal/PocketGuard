import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, MessageSquare, Sparkles } from 'lucide-react';

const mobileNavItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Wallet', path: '/wallet', icon: Wallet },
  { name: 'Lending', path: '/lending', icon: Users },
  { name: 'Chat', path: '/chat', icon: MessageSquare },
  { name: 'AI', path: '/ai', icon: Sparkles },
];

const MobileNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[10px] tracking-tight">{item.name}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileNav;
