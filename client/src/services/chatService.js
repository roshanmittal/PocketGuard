import api from './api';

export const chatService = {
  getConversations: async () => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  getOrCreateConversation: async (data) => {
    const res = await api.post('/chat/conversations', data);
    return res.data;
  },

  getMessages: async (conversationId) => {
    const res = await api.get(`/chat/messages/${conversationId}`);
    return res.data;
  },

  sendMessage: async (messageData) => {
    const res = await api.post('/chat/messages', messageData);
    return res.data;
  },
};
