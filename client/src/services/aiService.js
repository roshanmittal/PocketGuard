import api from './api';

export const aiService = {
  getSummary: async () => {
    const res = await api.get('/ai/summary');
    return res.data;
  },

  queryAssistant: async (query) => {
    const res = await api.post('/ai/query', { query });
    return res.data;
  },

  executeAction: async (actionType, data) => {
    const res = await api.post('/ai/execute-action', { actionType, data });
    return res.data;
  },
};
