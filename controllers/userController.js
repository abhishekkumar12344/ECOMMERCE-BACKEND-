const { v4: uuidv4 } = require('uuid');
const { Users, Orders, OrderItems, Products, Messages } = require('../config/db');

const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let users = await Users.find({ role: 'user' }, { createdAt: -1 });
    if (search) { const s = search.toLowerCase(); users = users.filter(u=>u.name.toLowerCase().includes(s)||u.email.toLowerCase().includes(s)); }
    const withStats = await Promise.all(users.map(async u => {
      const orders = await Orders.find({ userId: u._id });
      const totalSpent = orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.totalAmount,0);
      const { password:_, ...safe } = u;
      return { ...safe, id: u._id, orderCount: orders.length, totalSpent };
    }));
    res.json({ success: true, users: withStats, total: withStats.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getUser = async (req, res) => {
  try {
    const user = await Users.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const orders = await Orders.find({ userId: user._id }, { createdAt: -1 });
    const { password:_, ...safe } = user;
    res.json({ success: true, user: { ...safe, id: user._id, recentOrders: orders.slice(0,10) } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user','admin'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    await Users.update({ _id: req.params.id }, { $set: { role } });
    const user = await Users.findOne({ _id: req.params.id });
    const { password:_, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    await Users.remove({ _id: req.params.id });
    res.json({ success: true, message: 'User deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getDashboardStats = async (req, res) => {
  try {
    const allUsers = await Users.find({ role: 'user' });
    const allProducts = await Products.find({ active: true });
    const allOrders = await Orders.find({});
    const allMessages = await Messages.find({});

    const stats = {
      totalUsers: allUsers.length,
      totalProducts: allProducts.length,
      totalOrders: allOrders.length,
      totalRevenue: allOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.totalAmount,0),
      pendingOrders: allOrders.filter(o=>o.status==='pending').length,
      processing: allOrders.filter(o=>o.status==='processing').length,
      shipped: allOrders.filter(o=>o.status==='shipped').length,
      deliveredOrders: allOrders.filter(o=>o.status==='delivered').length,
      cancelled: allOrders.filter(o=>o.status==='cancelled').length,
      unreadMessages: allMessages.filter(m=>!m.read).length,
      revenueToday: allOrders.filter(o=>o.status!=='cancelled' && new Date(o.createdAt).toDateString()===new Date().toDateString()).reduce((s,o)=>s+o.totalAmount,0),
    };

    const recentOrders = await Promise.all(
      allOrders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(async o => {
        const user = await Users.findOne({ _id: o.userId });
        return { ...o, id: o._id, user_name: user?.name };
      })
    );

    // Top products from order items
    const allItems = await OrderItems.find({});
    const productSales = {};
    for (const item of allItems) {
      if (!productSales[item.productName]) productSales[item.productName] = { product_name: item.productName, total_sold: 0, revenue: 0 };
      productSales[item.productName].total_sold += item.quantity;
      productSales[item.productName].revenue += item.price * item.quantity;
    }
    const topProducts = Object.values(productSales).sort((a,b)=>b.total_sold-a.total_sold).slice(0,5);

    // Monthly revenue
    const monthlyMap = {};
    allOrders.filter(o=>o.status!=='cancelled').forEach(o => {
      const month = new Date(o.createdAt).toISOString().slice(0,7);
      if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, orders: 0 };
      monthlyMap[month].revenue += o.totalAmount;
      monthlyMap[month].orders++;
    });
    const monthlyRevenue = Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);

    res.json({ success: true, stats, recentOrders, topProducts, monthlyRevenue });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// Contact
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email and message required' });
    await Messages.insert({ _id: uuidv4(), name, email, phone: phone||'', subject: subject||'', message, read: false, createdAt: new Date() });
    res.status(201).json({ success: true, message: 'Message sent! We will get back to you soon.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Messages.find({}, { createdAt: -1 });
    res.json({ success: true, messages: messages.map(m=>({...m, id:m._id})) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const markAsRead = async (req, res) => {
  try {
    await Messages.update({ _id: req.params.id }, { $set: { read: true } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteMessage = async (req, res) => {
  try {
    await Messages.remove({ _id: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getAllUsers, getUser, updateUserRole, deleteUser, getDashboardStats, submitContact, getMessages, markAsRead, deleteMessage };
