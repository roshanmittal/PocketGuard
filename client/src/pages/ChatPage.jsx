import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { chatService } from '../services/chatService';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import StartChatModal from '../components/chat/StartChatModal';

const ChatPage = () => {
  const { user } = useAuth();
  const { openAddModal, openRepayModal } = useOutletContext();
  const { socket, subscribeToFinancialUpdates } = useSocket();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStartChatOpen, setIsStartChatOpen] = useState(false);

  // Fetch all conversations
  const loadConversations = async () => {
    try {
      const res = await chatService.getConversations();
      if (res.success) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Handle URL query param: ?userId=...
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (targetUserId) {
      handleStartChatWithUser({ _id: targetUserId });
    }
  }, [searchParams]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await chatService.getMessages(activeConversationId);
        if (res.success) {
          setActiveConversation(res.data);
          setMessages(res.data.messages);

          // Clear unread badge in sidebar locally
          setConversations((prev) =>
            prev.map((c) =>
              c._id === activeConversationId ? { ...c, unreadCount: 0 } : c
            )
          );

          // Join socket room
          socket?.emit('conversation:join', activeConversationId);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadMessages();

    return () => {
      socket?.emit('conversation:leave', activeConversationId);
    };
  }, [activeConversationId, socket]);

  // Real-time socket message listener
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // If message belongs to active conversation, append to list
      if (activeConversationId && msg.conversation.toString() === activeConversationId.toString()) {
        setMessages((prev) => [...prev, msg]);
      }

      // Update last message in sidebar
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === msg.conversation.toString()) {
            return {
              ...c,
              lastMessage: msg,
              unreadCount:
                c._id === activeConversationId ? 0 : (c.unreadCount || 0) + 1,
            };
          }
          return c;
        })
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:received', (data) => {
      handleNewMessage(data.message);
    });

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:received');
    };
  }, [socket, activeConversationId]);

  // Real-time financial update subscription
  useEffect(() => {
    const unsubscribe = subscribeToFinancialUpdates(async (type) => {
      // Refresh financial relationship in active conversation
      if (activeConversationId) {
        try {
          const res = await chatService.getMessages(activeConversationId);
          if (res.success && res.data) {
            setActiveConversation((prev) => ({
              ...prev,
              financialRelationship: res.data.financialRelationship,
            }));
          }
        } catch (err) {
          console.error(err);
        }
      }
      loadConversations();
    });

    return () => unsubscribe();
  }, [activeConversationId]);

  // Send message
  const handleSendMessage = async (text) => {
    if (!activeConversationId) return;
    try {
      await chatService.sendMessage({
        conversationId: activeConversationId,
        message: text,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message');
    }
  };

  // Start chat with user from search modal or query param
  const handleStartChatWithUser = async (targetUser) => {
    try {
      const res = await chatService.getOrCreateConversation({
        recipientId: targetUser._id,
      });
      if (res.success && res.data) {
        setActiveConversationId(res.data._id);
        loadConversations();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to open conversation');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex">
      {/* Sidebar List */}
      <div className={`h-full ${activeConversationId ? 'hidden md:block' : 'w-full'}`}>
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={(id) => setActiveConversationId(id)}
          onOpenStartChat={() => setIsStartChatOpen(true)}
        />
      </div>

      {/* Main Chat Window */}
      <div className={`flex-1 h-full ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          currentUserId={user?._id}
          onSendMessage={handleSendMessage}
          onBack={() => setActiveConversationId(null)}
          onGiveMoney={(counterparty) => openAddModal('lend', counterparty)}
          onReceiveMoney={(counterparty) => openAddModal('borrow', counterparty)}
          onRepay={(rel) => openRepayModal(rel)}
        />
      </div>

      {/* Start Chat Modal */}
      <StartChatModal
        isOpen={isStartChatOpen}
        onClose={() => setIsStartChatOpen(false)}
        onSelectUser={handleStartChatWithUser}
      />
    </div>
  );
};

export default ChatPage;
