const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { exec } = require('child_process');
const tracer = require('dd-trace');

// Weak admin check - VULNERABLE
function requireAdmin(req, res, next) {
  // VULNERABILITY: Checking session without proper validation
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.status(403).render('error', { error: 'Access denied' });
  }
  next();
}

// Admin dashboard
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [orders] = await db.query('SELECT COUNT(*) as total FROM orders');
    const [users] = await db.query('SELECT COUNT(*) as total FROM users');
    const [revenue] = await db.query('SELECT SUM(total_amount) as total FROM orders WHERE payment_status = "paid"');

    res.render('admin-dashboard', {
      user: req.session.user,
      stats: {
        orders: orders[0].total,
        users: users[0].total,
        revenue: parseFloat(revenue[0].total) || 0
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// View all orders - VULNERABLE to SQL Injection
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const searchTerm = req.query.search || '';
    let query = 'SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id';

    if (searchTerm) {
      // VULNERABILITY: SQL Injection
      query += ` WHERE u.username LIKE '%${searchTerm}%' OR o.id = ${searchTerm || 0}`;
    }

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await db.query(query);

    // Convert total_amount to numbers for all orders
    orders.forEach(order => {
      order.total_amount = parseFloat(order.total_amount);
    });

    res.render('admin-orders', {
      user: req.session.user,
      orders,
      searchTerm
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Update order status - VULNERABLE
router.post('/orders/update', requireAdmin, async (req, res) => {
  const { orderId, status } = req.body;

  try {
    // VULNERABILITY: SQL Injection and no input validation
    const query = `UPDATE orders SET status = '${status}' WHERE id = ${orderId}`;
    await db.query(query);

    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// View all users - VULNERABLE
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // VULNERABILITY: Exposing password hashes
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const [users] = await db.query(query);

    res.render('admin-users', {
      user: req.session.user,
      users
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Trigger CWS detection scenarios - For security testing
router.post('/security/cws-trigger', requireAdmin, (req, res) => {
  const span = tracer.scope().active();
  const { scenario } = req.body;

  // Set user information for ASM tracking
  if (req.session && req.session.userId && req.session.user) {
    tracer.setUser({
      id: req.session.userId.toString(),
      email: req.session.user.email || undefined,
      name: req.session.user.username || undefined,
      isAdmin: req.session.user.isAdmin || false
    });
  }

  if (span) {
    span.setTag('security.test', 'cws_scenario');
    span.setTag('cws.scenario', scenario);
    span.setTag('usr.id', req.session.userId);
    span.setTag('usr.is_admin', req.session.user.isAdmin);
  }

  // Execute the CWS detonate script with specific scenario
  const scriptPath = '/app/scripts/cws-detonate.sh';
  const command = scenario === 'all' ? scriptPath : `${scriptPath} ${scenario}`;

  exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
    if (error) {
      return res.json({
        success: false,
        error: error.message,
        stderr,
        message: 'CWS scenario execution failed'
      });
    }

    res.json({
      success: true,
      scenario,
      output: stdout,
      message: 'CWS scenario triggered successfully. Check Datadog CWS for detections.'
    });
  });
});

// Execute system commands - EXTREMELY VULNERABLE (Command Injection)
router.post('/system/execute', requireAdmin, (req, res) => {
  const span = tracer.scope().active();
  const { command } = req.body;

  // Set user information for ASM tracking
  if (req.session && req.session.userId && req.session.user) {
    tracer.setUser({
      id: req.session.userId.toString(),
      email: req.session.user.email || undefined,
      name: req.session.user.username || undefined,
      isAdmin: req.session.user.isAdmin || false
    });
  }

  if (span) {
    span.setTag('vulnerability.type', 'command_injection');
    span.setTag('vulnerability.category', 'injection');
    span.setTag('vulnerability.severity', 'critical');
    span.setTag('attack.vector', 'system_command');
    span.setTag('system.command', command);
    span.setTag('input.validation', 'none');
    span.setTag('input.sanitization', 'none');
    span.setTag('http.client_ip', req.ip);
    span.setTag('usr.id', req.session.userId);
    span.setTag('usr.is_admin', req.session.user.isAdmin);
  }

  // VULNERABILITY: Command Injection - executing user input directly
  exec(command, (error, stdout, stderr) => {
    if (error) {
      if (span) {
        span.setTag('command.error', true);
        span.setTag('command.error_message', error.message);
      }
      return res.json({
        success: false,
        error: error.message,
        stderr
      });
    }

    if (span) {
      span.setTag('command.success', true);
      span.setTag('command.output_length', stdout.length);
    }

    res.json({
      success: true,
      output: stdout,
      stderr
    });
  });
});

// Database query executor - VULNERABLE
router.post('/database/query', requireAdmin, async (req, res) => {
  const span = tracer.scope().active();
  const { query } = req.body;

  try {
    // Set user information for ASM tracking
    if (req.session && req.session.userId && req.session.user) {
      tracer.setUser({
        id: req.session.userId.toString(),
        email: req.session.user.email || undefined,
        name: req.session.user.username || undefined,
        isAdmin: req.session.user.isAdmin || false
      });
    }

    if (span) {
      span.setTag('vulnerability.type', 'arbitrary_sql_execution');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('vulnerability.severity', 'critical');
      span.setTag('sql.query', query);
      span.setTag('sql.validation', 'none');
      span.setTag('http.client_ip', req.ip);
      span.setTag('usr.id', req.session.userId);
    }

    // VULNERABILITY: Allowing arbitrary SQL execution
    const [results] = await db.query(query);

    if (span) {
      span.setTag('query.success', true);
      span.setTag('query.row_count', results.length);
    }

    res.json({
      success: true,
      results,
      rowCount: results.length
    });
  } catch (error) {
    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.setTag('vulnerability.type', 'information_disclosure');
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export data - VULNERABLE to path traversal
router.get('/export', requireAdmin, (req, res) => {
  const { type, filename } = req.query;

  // VULNERABILITY: Path traversal
  const filepath = filename || 'export.csv';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filepath}"`);

  if (type === 'orders') {
    db.query('SELECT * FROM orders')
      .then(([rows]) => {
        const csv = convertToCSV(rows);
        res.send(csv);
      })
      .catch(error => {
        res.status(500).send('Export failed: ' + error.message);
      });
  } else {
    res.status(400).send('Invalid export type');
  }
});

// Helper function to convert to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return `"${value}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

module.exports = router;
