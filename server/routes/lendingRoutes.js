const express = require('express');
const router = express.Router();
const {
  getLendingDashboard,
  createLendingTransaction,
  repayLending,
  getRelationshipDetails,
} = require('../controllers/lendingController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getLendingDashboard);
router.post('/', protect, createLendingTransaction);
router.post('/:id/repay', protect, repayLending);
router.get('/:id', protect, getRelationshipDetails);

module.exports = router;
