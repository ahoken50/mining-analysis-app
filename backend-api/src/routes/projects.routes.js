const express = require('express');
const router = express.Router();
const { createProject, getProject } = require('../controllers/projects.controller');
const verifyToken = require('../middleware/auth.middleware');

// Apply middleware to all routes in this router
router.use(verifyToken);

// POST /api/projects - Create a new project
router.post('/', createProject);

// GET /api/projects/:id - Get a project by ID
router.get('/:id', getProject);

module.exports = router;
