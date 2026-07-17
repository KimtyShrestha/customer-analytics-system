const express = require('express');
const authService = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required', data: null });
    }

    const result = await authService.login(email, password);

    if (!result) {
      return res.status(401).json({ success: false, message: 'Invalid credentials', data: null });
    }

    res.json({ success: true, message: 'Login successful', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Authenticated', data: req.user });
});

module.exports = router;
