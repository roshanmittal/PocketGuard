import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { getInitials, formatCurrency } from '../utils/formatters';
import { User, Mail, Phone, Wallet, ShieldCheck, Check, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80',
];

const ProfilePage = () => {
  const { user, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.profileImage || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authService.updateProfile({
        name: name.trim(),
        profileImage: selectedAvatar,
      });

      if (res.success) {
        updateUserProfile(res.data);
        setSuccessMsg('Profile updated successfully!');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Your Profile & Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal details, avatar, and authentication
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200">
          {errorMsg}
        </div>
      )}

      {/* Profile Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
        {/* Avatar preview */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xl text-slate-700 dark:text-slate-200 border-4 border-emerald-500 shadow-md">
            {selectedAvatar ? (
              <img src={selectedAvatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              getInitials(name)
            )}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{name}</h3>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified User
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Wallet: {formatCurrency(user?.walletBalance || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Avatar Selection Picker */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Choose Avatar
          </label>
          <div className="flex items-center gap-3 overflow-x-auto py-1">
            {AVATAR_OPTIONS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(url)}
                className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform hover:scale-105 ${
                  selectedAvatar === url
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'border-transparent opacity-70'
                }`}
              >
                <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                {selectedAvatar === url && (
                  <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mobile Number (Immutable)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  disabled
                  value={user?.mobile || ''}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs sm:text-sm cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs sm:text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="py-2.5 px-4 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
