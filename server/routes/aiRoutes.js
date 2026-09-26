const express = require('express');
const router = express.Router();
const { getAiSummary, queryAiAssistant } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, getAiSummary);
router.post('/query', protect, queryAiAssistant);

module.exports = router;
