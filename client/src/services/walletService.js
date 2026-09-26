import api from './api';

export const walletService = {
  getDashboard: async () => {
    const res = await api.get('/wallet/dashboard');
    return res.data;
  },

  adjustBalance: async (adjustmentData) => {
    const res = await api.post('/wallet/adjust', adjustmentData);
    return res.data;
  },
};
