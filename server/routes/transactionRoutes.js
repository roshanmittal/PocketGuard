const express = require('express');
const router = express.Router();
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getTransactions);
router.post('/', protect, createTransaction);
router.put('/:id', protect, updateTransaction);
router.delete('/:id', protect, deleteTransaction);

module.exports = router;
