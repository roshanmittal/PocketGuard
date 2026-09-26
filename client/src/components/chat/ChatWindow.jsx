import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import FinancialSummaryBar from './FinancialSummaryBar';
import { getInitials } from '../../utils/formatters';
import { Send, ArrowLeft, Phone, UserCheck } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const ChatWindow = ({
  conversation,
  messages = [],
  currentUserId,
  onSendMessage,
  onBack,
  onGiveMoney,
  onReceiveMoney,
  onRepay,
}) => {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { socket, isUserOnline } = useSocket();

  const participant = conversation?.participant;
  const isOnline = isUserOnline(participant?._id);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherUserTyping]);

  // Socket typing listeners
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleTypingStart = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== currentUserId) {
        setOtherUserTyping(true);
      }
    };

    const handleTypingStop = ({ conversationId, userId }) => {
      if (conversationId === conversation._id && userId !== currentUserId) {
        setOtherUserTyping(false);
      }
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, conversation?._id, currentUserId]);

  const handleInputChange = (e) => {
    setText(e.target.value);

    if (socket && conversation?._id) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('typing:start', {
          conversationId: conversation._id,
          receiverId: participant?._id,
        });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('typing:stop', {
          conversationId: conversation._id,
          receiverId: participant?._id,
        });
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    if (socket && conversation?._id) {
      setIsTyping(false);
      socket.emit('typing:stop', {
        conversationId: conversation._id,
        receiverId: participant?._id,
      });
    }

    onSendMessage(text.trim());
    setText('');
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-900/50 text-slate-400">
        <p className="text-sm font-semibold">Select a conversation to start chatting</p>
        <p className="text-xs mt-1">Or search for a contact using their mobile number</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950">
      {/* Chat Header */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative">
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
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </div>

          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              {participant?.name || 'Contact'}
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`font-semibold ${
                  isOnline
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400'
                }`}
              >
                ● {isOnline ? 'Online' : 'Offline'}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {participant?.mobile}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Real-Time Financial Summary Panel */}
      <FinancialSummaryBar
        financialRelationship={conversation.financialRelationship}
        onGiveMoney={() => onGiveMoney(participant)}
        onReceiveMoney={() => onReceiveMoney(participant)}
        onRepay={() => onRepay(conversation.financialRelationship)}
      />

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isMe={
              msg.sender?._id
                ? msg.sender._id.toString() === currentUserId.toString()
                : msg.sender?.toString() === currentUserId.toString()
            }
          />
        ))}

        {otherUserTyping && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 italic p-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
            <span
              className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></span>
            <span
              className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            ></span>
            <span>{participant?.name || 'User'} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={`Message ${participant?.name || 'user'}...`}
          value={text}
          onChange={handleInputChange}
          className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white shadow-md shadow-emerald-600/20 transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
