import api from './api';

export const transactionService = {
  getTransactions: async (params = {}) => {
    const res = await api.get('/transactions', { params });
    return res.data;
  },

  createTransaction: async (data) => {
    const res = await api.post('/transactions', data);
    return res.data;
  },

  deleteTransaction: async (id) => {
    const res = await api.delete(`/transactions/${id}`);
    return res.data;
  },
};
