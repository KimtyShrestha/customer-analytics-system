const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const importService = require('../services/import.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(Object.assign(new Error('Only CSV files are accepted'), { status: 400, expose: true }));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded', data: null });
    }
    const result = await importService.importCsv(req.file.buffer, req.file.originalname, req.user.id);
    res.json({ success: true, message: 'Import completed', data: result });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = require('../config/db');
    const r = await db.query(
      `SELECT b.id, b.original_filename, b.status, b.total_rows, b.successful_rows,
              b.rejected_rows, b.total_invoices, b.started_at, u.full_name AS imported_by
         FROM import_batches b JOIN users u ON u.id = b.imported_by
        ORDER BY b.started_at DESC LIMIT 20`
    );
    res.json({ success: true, message: 'Import history', data: r.rows });
  } catch (err) { next(err); }
});

module.exports = router;
