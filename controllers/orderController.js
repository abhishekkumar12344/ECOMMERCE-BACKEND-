const { v4: uuidv4 } = require('uuid');
const { Orders, OrderItems, Products, Users } = require('../config/db');

const getFullOrder = async (orderId) => {
  const order = await Orders.findOne({ _id: orderId });
  if (!order) return null;
  const items = await OrderItems.find({ orderId });
  return { ...order, id: order._id, items, shippingAddress: order.shippingAddress };
};

const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;
    if (!items?.length) return res.status(400).json({ success: false, message: 'No items provided' });
    if (!shippingAddress) return res.status(400).json({ success: false, message: 'Shipping address required' });

    let totalAmount = 0;
    const validated = [];
    for (const item of items) {
      const product = await Products.findOne({ _id: item.productId, active: true });
      if (!product) return res.status(400).json({ success: false, message: `Product not found: ${item.productId}` });
      if (product.stock < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      totalAmount += product.price * item.quantity;
      validated.push({ ...item, product });
    }

    const orderId = uuidv4();
    await Orders.insert({ _id: orderId, userId: req.user._id, totalAmount, status: 'pending', paymentMethod: paymentMethod||'cod', paymentStatus: 'pending', shippingAddress, notes: notes||'', createdAt: new Date() });

    for (const item of validated) {
      await OrderItems.insert({ _id: uuidv4(), orderId, productId: item.product._id, productName: item.product.name, productImage: item.product.image, quantity: item.quantity, price: item.product.price, unit: item.product.unit });
      await Products.update({ _id: item.product._id }, { $set: { stock: item.product.stock - item.quantity } });
    }

    res.status(201).json({ success: true, order: await getFullOrder(orderId) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Orders.find({ userId: req.user._id }, { createdAt: -1 });
    const full = await Promise.all(orders.map(o => getFullOrder(o._id)));
    res.json({ success: true, orders: full });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getOrder = async (req, res) => {
  try {
    const order = await Orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (req.user.role !== 'admin' && order.userId !== req.user._id) return res.status(403).json({ success: false, message: 'Not authorized' });
    res.json({ success: true, order: await getFullOrder(req.params.id) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    const orders = await Orders.find(query, { createdAt: -1 });
    const full = await Promise.all(orders.map(async o => {
      const user = await Users.findOne({ _id: o.userId });
      return { ...await getFullOrder(o._id), userName: user?.name, userEmail: user?.email };
    }));
    res.json({ success: true, orders: full, total: full.length, pages: 1, page: 1 });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;
    await Orders.update({ _id: req.params.id }, { $set: update });
    res.json({ success: true, order: await getFullOrder(req.params.id) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Orders.findOne({ _id: req.params.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.userId !== req.user._id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (!['pending','confirmed'].includes(order.status)) return res.status(400).json({ success: false, message: 'Cannot cancel this order' });
    await Orders.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    const items = await OrderItems.find({ orderId: req.params.id });
    for (const item of items) {
      await Products.update({ _id: item.productId }, { $inc: { stock: item.quantity } });
    }
    res.json({ success: true, order: await getFullOrder(req.params.id) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getOrderStats = async (req, res) => {
  try {
    const all = await Orders.find({});
    const stats = {
      total: all.length,
      pending: all.filter(o=>o.status==='pending').length,
      confirmed: all.filter(o=>o.status==='confirmed').length,
      processing: all.filter(o=>o.status==='processing').length,
      shipped: all.filter(o=>o.status==='shipped').length,
      delivered: all.filter(o=>o.status==='delivered').length,
      cancelled: all.filter(o=>o.status==='cancelled').length,
      revenue: all.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.totalAmount,0),
    };
    res.json({ success: true, stats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createOrder, getMyOrders, getOrder, getAllOrders, updateOrderStatus, cancelOrder, getOrderStats };
