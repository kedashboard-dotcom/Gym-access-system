const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');

// New member registration
router.post('/register', memberController.register);

// Membership renewal
router.post('/renew', memberController.renew);

// Check membership status
router.get('/status', memberController.checkStatus);

// Get active members (admin)
router.get('/active', memberController.getActiveMembers);

module.exports = router;