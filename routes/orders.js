// routes/orders.js
const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, getAllOrders, updateOrderStatus, cancelOrder, getOrderStats } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats', protect, adminOnly, getOrderStats);
router.get('/myorders', protect, getMyOrders);
router.get('/', protect, adminOnly, getAllOrders);
router.post('/', protect, createOrder);
router.get('/:id', protect, getOrder);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);

module.exports = router;
