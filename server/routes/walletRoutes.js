const express = require('express');
const router = express.Router();
const { getWalletDashboard, adjustWalletBalance } = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

router.get('/dashboard', protect, getWalletDashboard);
router.post('/adjust', protect, adjustWalletBalance);

module.exports = router;
