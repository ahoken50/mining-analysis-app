const express = require('express');
const router = express.Router();
const { startAnalysis } = require('../controllers/analysis.controller');
const verifyToken = require('../middleware/auth.middleware');

// Apply middleware
router.use(verifyToken);

// POST /api/analysis/start - Trigger analysis for a project
router.post('/start', startAnalysis);

module.exports = router;
