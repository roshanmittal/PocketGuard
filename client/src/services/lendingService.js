import api from './api';

export const lendingService = {
  getDashboard: async () => {
    const res = await api.get('/lending');
    return res.data;
  },

  createTransaction: async (data) => {
    const res = await api.post('/lending', data);
    return res.data;
  },

  repay: async (relationshipId, repaymentData) => {
    const res = await api.post(`/lending/${relationshipId}/repay`, repaymentData);
    return res.data;
  },

  getDetails: async (id) => {
    const res = await api.get(`/lending/${id}`);
    return res.data;
  },
};
