import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const AuthLayout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 transition-colors">
      {/* Header bar */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Shield className="w-5 h-5 fill-white/20 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-600 dark:from-white dark:via-slate-100 dark:to-emerald-400 bg-clip-text text-transparent">
            PocketGuard
          </span>
        </Link>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Main form card container */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <Outlet />
      </div>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 py-4">
        © {new Date().getFullYear()} PocketGuard. Real-Time Full-Stack Fintech Platform.
      </footer>
    </div>
  );
};

export default AuthLayout;
