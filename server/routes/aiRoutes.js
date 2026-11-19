const express = require('express');
const router = express.Router();
const { getAiSummary, queryAiAssistant, executeAiTransaction } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getAiSummary);
router.post('/query', protect, queryAiAssistant);
router.post('/execute-action', protect, executeAiTransaction);

module.exports = router;
