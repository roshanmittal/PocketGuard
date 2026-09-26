import React, { useState } from 'react';
import { getInitials, formatDate } from '../../utils/formatters';
import { Search, UserPlus, Circle } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const ChatSidebar = ({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onOpenStartChat,
}) => {
  const [filterText, setFilterText] = useState('');
  const { isUserOnline } = useSocket();

  const filtered = conversations.filter((c) => {
    const name = c.participant?.name || '';
    const mobile = c.participant?.mobile || '';
    const query = filterText.toLowerCase();
    return name.toLowerCase().includes(query) || mobile.includes(query);
  });

  return (
    <div className="w-full md:w-80 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Search & New Chat Header */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Conversations</h3>
          <button
            onClick={onOpenStartChat}
            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
            title="Start new conversation"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search chats by name or mobile..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No conversations found.
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv._id === activeConversationId;
            const participant = conv.participant;
            const online = isUserOnline(participant?._id);

            return (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors ${
                  isActive
                    ? 'bg-emerald-50/80 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Avatar with live status dot */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                    {participant?.profileImage ? (
                      <img
                        src={participant.profileImage}
                        alt={participant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(participant?.name)
                    )}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                      online ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                    title={online ? 'Online' : 'Offline'}
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {participant?.name || 'Contact'}
                    </h4>
                    {conv.lastMessage?.createdAt && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatDate(conv.lastMessage.createdAt, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                      {conv.lastMessage?.message || 'No messages yet'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
