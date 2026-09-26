import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, UserCheck, Shield } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { name: 'Roshan Kumar', email: 'roshan@pocketguard.com', role: 'Main User (Lender)' },
  { name: 'Rahul Sharma', email: 'rahul@pocketguard.com', role: 'Borrower (Owes ₹3,000)' },
  { name: 'Aman Verma', email: 'aman@pocketguard.com', role: 'Borrower (Owes ₹2,000)' },
  { name: 'Priya Patel', email: 'priya@pocketguard.com', role: 'Lender (Roshan owes ₹1,500)' },
];

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please provide email/mobile and password');
      return;
    }

    setLoading(true);
    const res = await login(identifier, password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.message);
    }
  };

  const handleQuickDemoFill = (email) => {
    setIdentifier(email);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 p-6 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Welcome Back
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Access your personal wallet and synchronized lending ledger
        </p>
      </div>

      {/* Demo Credentials Quick Fill Buttons */}
      <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-200/60 dark:border-emerald-900/40">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
          <UserCheck className="w-4 h-4" />
          <span>Quick Demo Logins (Click to Autofill)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleQuickDemoFill(acc.email)}
              className="text-left p-2 rounded-xl bg-white dark:bg-slate-850 hover:bg-emerald-100 dark:hover:bg-slate-700/80 border border-emerald-100 dark:border-slate-700 transition-all text-xs"
            >
              <p className="font-bold text-slate-900 dark:text-white truncate">{acc.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{acc.role}</p>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Email or Mobile Number
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              required
              placeholder="e.g. roshan@pocketguard.com or 9876543210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
