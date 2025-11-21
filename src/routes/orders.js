const express = require('express');
const router = express.Router();
const db = require('../config/database');
const tracer = require('dd-trace');

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Menu page
router.get('/menu', requireAuth, async (req, res) => {
  const span = tracer.scope().active();

  try {
    // VULNERABILITY: No prepared statements
    const category = req.query.category || '';
    let query = 'SELECT * FROM products WHERE available = TRUE';

    if (category) {
      // VULNERABILITY: SQL Injection via query parameter
      query += ` AND category = '${category}'`;

      if (span) {
        span.setTag('vulnerability.type', 'sql_injection');
        span.setTag('vulnerability.category', 'injection');
        span.setTag('attack.vector', 'query_parameter');
        span.setTag('sql.query', query);
        span.setTag('input.category', category);
        span.setTag('http.client_ip', req.ip);
      }
    }

    const [products] = await db.query(query);

    // Convert price strings to numbers
    products.forEach(product => {
      product.price = parseFloat(product.price);
    });

    if (span) {
      span.setTag('menu.products_count', products.length);
      span.setTag('menu.category', category || 'all');
    }

    res.render('menu', {
      user: req.session.user,
      products,
      selectedCategory: category
    });
  } catch (error) {
    console.error('Menu error:', error);
    if (span) {
      span.setTag('error', true);
      span.setTag('error.type', error.name);
      span.setTag('error.message', error.message);
      span.setTag('vulnerability.type', 'information_disclosure');
    }
    res.status(500).render('error', { error: error.message });
  }
});

// View cart
router.get('/cart', requireAuth, (req, res) => {
  const cart = req.session.cart || [];
  res.render('cart', { user: req.session.user, cart });
});

// Add to cart
router.post('/cart/add', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const { productId, quantity } = req.body;

  try {
    // VULNERABILITY: No input validation
    const query = `SELECT * FROM products WHERE id = ${productId}`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('attack.vector', 'body_parameter');
      span.setTag('sql.query', query);
      span.setTag('input.product_id', productId);
      span.setTag('input.quantity', quantity);
      span.setTag('vulnerability.no_validation', true);
    }

    const [products] = await db.query(query);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];

    if (!req.session.cart) {
      req.session.cart = [];
    }

    // Check if product already in cart
    const existingItem = req.session.cart.find(item => item.id === parseInt(productId));

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
    } else {
      req.session.cart.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: parseInt(quantity)
      });
    }

    res.json({ success: true, cartCount: req.session.cart.length });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove from cart
router.post('/cart/remove', requireAuth, (req, res) => {
  const { productId } = req.body;

  if (req.session.cart) {
    req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
  }

  res.json({ success: true });
});

// Checkout page
router.get('/checkout', requireAuth, async (req, res) => {
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.redirect('/orders/menu');
  }

  // Get user details
  const query = `SELECT * FROM users WHERE id = ${req.session.userId}`;
  const [users] = await db.query(query);
  const user = users[0];

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  res.render('checkout', {
    user: req.session.user,
    cart,
    total,
    userDetails: user
  });
});

// Place order - VULNERABLE
router.post('/place', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const { deliveryAddress, deliveryPhone, paymentMethod, notes } = req.body;
  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // VULNERABILITY: SQL Injection
    const orderQuery = `INSERT INTO orders (user_id, total_amount, delivery_address, delivery_phone, payment_method, notes)
                        VALUES (${req.session.userId}, ${total}, '${deliveryAddress}', '${deliveryPhone}', '${paymentMethod}', '${notes}')`;

    const [result] = await db.query(orderQuery);
    const orderId = result.insertId;

    if (span) {
      span.setTag('order.id', orderId);
      span.setTag('order.total', total);
    }

    // Insert order items
    for (const item of cart) {
      const itemQuery = `INSERT INTO order_items (order_id, product_id, quantity, price)
                         VALUES (${orderId}, ${item.id}, ${item.quantity}, ${item.price})`;
      await db.query(itemQuery);
    }

    // Clear cart
    req.session.cart = [];

    res.json({
      success: true,
      orderId,
      redirectUrl: `/orders/confirmation/${orderId}`
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Order confirmation
router.get('/confirmation/:orderId', requireAuth, async (req, res) => {
  const { orderId } = req.params;

  try {
    // VULNERABILITY: No authorization check - any logged-in user can view any order
    const orderQuery = `SELECT o.*, u.username, u.email
                        FROM orders o
                        JOIN users u ON o.user_id = u.id
                        WHERE o.id = ${orderId}`;

    const [orders] = await db.query(orderQuery);

    if (orders.length === 0) {
      return res.status(404).render('error', { error: 'Order not found' });
    }

    const order = orders[0];

    // Convert numeric fields to numbers
    order.total_amount = parseFloat(order.total_amount);

    // Get order items
    const itemsQuery = `SELECT oi.*, p.name
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ${orderId}`;

    const [items] = await db.query(itemsQuery);

    // Convert item prices to numbers
    items.forEach(item => {
      item.price = parseFloat(item.price);
    });

    res.render('order-confirmation', {
      user: req.session.user,
      order,
      items
    });
  } catch (error) {
    console.error('Order confirmation error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// My orders - VULNERABLE to IDOR
router.get('/my-orders', requireAuth, async (req, res) => {
  try {
    // Get user ID from query parameter if provided (VULNERABILITY: IDOR)
    const userId = req.query.userId || req.session.userId;

    const query = `SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC`;
    const [orders] = await db.query(query);

    // Convert total_amount to numbers for all orders
    orders.forEach(order => {
      order.total_amount = parseFloat(order.total_amount);
    });

    res.render('my-orders', {
      user: req.session.user,
      orders
    });
  } catch (error) {
    console.error('My orders error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Print order - VULNERABLE using outdated libraries
router.get('/print/:orderId', requireAuth, async (req, res) => {
  const span = tracer.scope().active();
  const { orderId } = req.params;

  try {
    // VULNERABILITY: Using outdated PDFKit and Handlebars with known CVEs
    const PDFDocument = require('pdfkit');
    const Handlebars = require('handlebars');

    if (span) {
      span.setTag('vulnerability.type', 'vulnerable_dependencies');
      span.setTag('vulnerability.category', 'software_composition');
      span.setTag('vulnerable.library', 'pdfkit@0.11.0,handlebars@4.5.3');
      span.setTag('cve.pdfkit', 'Known vulnerabilities in old version');
      span.setTag('cve.handlebars', 'GHSA-f2jv-r9rf-7988,GHSA-765h-qjxv-5f44');
      span.setTag('order.id', orderId);
    }

    // VULNERABILITY: No authorization check
    const orderQuery = `SELECT o.*, u.username, u.email
                        FROM orders o
                        JOIN users u ON o.user_id = u.id
                        WHERE o.id = ${orderId}`;

    const [orders] = await db.query(orderQuery);

    if (orders.length === 0) {
      return res.status(404).send('Order not found');
    }

    const order = orders[0];
    order.total_amount = parseFloat(order.total_amount);

    // Get order items
    const itemsQuery = `SELECT oi.*, p.name
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ${orderId}`;

    const [items] = await db.query(itemsQuery);

    items.forEach(item => {
      item.price = parseFloat(item.price);
    });

    // VULNERABILITY: Using Handlebars with prototype pollution vulnerability
    const template = Handlebars.compile(`
      Order #{{orderId}}
      Customer: {{username}}
      Date: {{date}}

      Items:
      {{#each items}}
      - {{this.name}} x {{this.quantity}} = R$ {{this.subtotal}}
      {{/each}}

      Total: R$ {{total}}
    `);

    // Create PDF using outdated PDFKit
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=order-${orderId}.pdf`);

    doc.pipe(res);

    // VULNERABILITY: XSS through PDF content - no sanitization
    doc.fontSize(20).text('Insecure Pizza & Coffee', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Order #${orderId}`);
    doc.moveDown();
    doc.fontSize(12).text(`Customer: ${order.username}`);
    doc.text(`Email: ${order.email}`);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment Status: ${order.payment_status}`);
    doc.moveDown();
    doc.text('Order Items:', { underline: true });
    doc.moveDown();

    items.forEach(item => {
      const subtotal = (item.price * item.quantity).toFixed(2);
      // VULNERABILITY: No input sanitization
      doc.text(`${item.name} x ${item.quantity} = R$ ${subtotal}`);
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total: R$ ${order.total_amount.toFixed(2)}`, { bold: true });
    doc.moveDown();
    doc.fontSize(10).text(`Delivery Address: ${order.delivery_address || 'N/A'}`);
    doc.text(`Delivery Phone: ${order.delivery_phone || 'N/A'}`);

    if (span) {
      span.setTag('pdf.generated', true);
      span.setTag('pdf.items_count', items.length);
    }

    doc.end();

  } catch (error) {
    console.error('Print order error:', error);
    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
    }

    // If libraries not installed, provide fallback
    if (error.code === 'MODULE_NOT_FOUND') {
      res.status(500).send(`
        <h1>Error: Required libraries not installed</h1>
        <p>The print functionality requires outdated vulnerable libraries:</p>
        <ul>
          <li>pdfkit@0.11.0 (has known vulnerabilities)</li>
          <li>handlebars@4.5.3 (CVE-2019-19919, CVE-2019-20920, CVE-2021-23369)</li>
        </ul>
        <p>To enable this feature, install with: <code>npm install pdfkit@0.11.0 handlebars@4.5.3</code></p>
        <p><strong>Warning:</strong> These packages have known security vulnerabilities and should only be used in testing environments.</p>
      `);
    } else {
      res.status(500).send('Error generating PDF: ' + error.message);
    }
  }
});

module.exports = router;
