const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const svc = require('../services/analytics.service');

const router = express.Router();

router.get('/dashboard', requireAuth, async (req, res, next) => {
  try { res.json({ success: true, message: 'Dashboard data', data: await svc.getDashboard() }); }
  catch (e) { next(e); }
});

router.get('/customers', requireAuth, async (req, res, next) => {
  try {
    const { segment, search, sort, page, limit } = req.query;
    const data = await svc.getCustomerMetrics({
      segment, search, sort,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 25, 100),
    });
    res.json({ success: true, message: 'Customer analytics', data });
  } catch (e) { next(e); }
});

router.get('/customers/:id', requireAuth, async (req, res, next) => {
  try {
    const data = await svc.getCustomerProfile(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Customer not found', data: null });
    res.json({ success: true, message: 'Customer profile', data });
  } catch (e) { next(e); }
});

router.post('/recalculate', requireAuth, requireRole('admin'), async (req, res, next) => {
  try { res.json({ success: true, message: 'Segments recalculated', data: await svc.recalculateSegments() }); }
  catch (e) { next(e); }
});

router.get('/settings', requireAuth, async (req, res, next) => {
  try { res.json({ success: true, message: 'Segmentation settings', data: await svc.getSettings() }); }
  catch (e) { next(e); }
});

module.exports = router;