import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { authService } from '../../services/authService';
import { Search, UserCheck } from 'lucide-react';
import { getInitials } from '../../utils/formatters';

const StartChatModal = ({ isOpen, onClose, onSelectUser }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await authService.searchUsers(query.trim());
          if (res.success) {
            setResults(res.data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Conversation">
      <div className="space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by registered mobile number or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            autoFocus
          />
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {loading && (
            <p className="text-center py-4 text-xs text-slate-400">Searching...</p>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-center py-4 text-xs text-slate-400">
              No registered user found with "{query}"
            </p>
          )}

          {results.map((u) => (
            <button
              key={u._id}
              onClick={() => {
                onSelectUser(u);
                onClose();
              }}
              className="w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl flex items-center justify-between text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                  {u.profileImage ? (
                    <img
                      src={u.profileImage}
                      alt={u.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    getInitials(u.name)
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {u.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">{u.mobile}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Chat
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default StartChatModal;
