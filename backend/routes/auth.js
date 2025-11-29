const express = require('express');
const router = express.Router();

// Simple admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized: Invalid API key'
    });
  }
  
  next();
};

// Admin login endpoint
router.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        token: 'admin-token',
        user: {
          username: username,
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      status: 'error',
      message: 'Invalid credentials'
    });
  }
});

// Get system stats (admin only)
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const db = require('../config/database');
    
    const [totalMembers] = await db.query('SELECT COUNT(*) as count FROM users');
    const [activeMembers] = await db.query('SELECT COUNT(*) as count FROM users WHERE status = "active" AND membership_end > NOW()');
    const [todayPayments] = await db.query('SELECT COUNT(*) as count FROM payments WHERE DATE(created_at) = CURDATE()');
    const [totalRevenue] = await db.query('SELECT SUM(amount) as total FROM payments WHERE status = "completed"');
    
    res.json({
      status: 'success',
      data: {
        total_members: totalMembers[0].count,
        active_members: activeMembers[0].count,
        today_registrations: todayPayments[0].count,
        total_revenue: totalRevenue[0].total || 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system stats'
    });
  }
});

module.exports = router;