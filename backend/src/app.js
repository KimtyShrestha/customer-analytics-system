const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running', data: null });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/imports', require('./routes/import.routes'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found', data: null });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.expose ? err.message : 'Internal server error',
    data: null,
  });
});

module.exports = app;
