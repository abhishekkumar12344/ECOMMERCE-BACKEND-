const { v4: uuidv4 } = require('uuid');
const { Products, Reviews } = require('../config/db');

const withRating = async (product) => {
  const reviews = await Reviews.find({ productId: product._id });
  const avg = reviews.length ? reviews.reduce((s,r)=>s+r.rating,0)/reviews.length : 0;
  return { ...product, id: product._id, avgRating: parseFloat(avg.toFixed(1)), reviewCount: reviews.length };
};

const getProducts = async (req, res) => {
  try {
    const { category, search, featured } = req.query;
    let query = { active: true };
    if (category && category !== 'all') query.category = category;
    if (featured === 'true') query.featured = true;
    let products = await Products.find(query, { createdAt: -1 });
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s));
    }
    const withRatings = await Promise.all(products.map(withRating));
    res.json({ success: true, products: withRatings, total: withRatings.length });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getProduct = async (req, res) => {
  try {
    const product = await Products.findOne({ _id: req.params.id, active: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const reviews = await Reviews.find({ productId: product._id }, { createdAt: -1 });
    const avg = reviews.length ? reviews.reduce((s,r)=>s+r.rating,0)/reviews.length : 0;
    res.json({ success: true, product: { ...product, id: product._id, reviews, avgRating: parseFloat(avg.toFixed(1)), reviewCount: reviews.length } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, unit, category, image, stock, featured } = req.body;
    if (!name || !price || !unit || !category) return res.status(400).json({ success: false, message: 'Name, price, unit, category required' });
    const id = uuidv4();
    const product = await Products.insert({ _id: id, name, description: description||'', price: parseFloat(price), unit, category, image: image||'', stock: parseInt(stock)||100, featured: !!featured, active: true, createdAt: new Date() });
    res.status(201).json({ success: true, product: { ...product, id: product._id } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const { name, description, price, unit, category, image, stock, featured, active } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = parseFloat(price);
    if (unit !== undefined) update.unit = unit;
    if (category !== undefined) update.category = category;
    if (image !== undefined) update.image = image;
    if (stock !== undefined) update.stock = parseInt(stock);
    if (featured !== undefined) update.featured = !!featured;
    if (active !== undefined) update.active = !!active;
    await Products.update({ _id: req.params.id }, { $set: update });
    const updated = await Products.findOne({ _id: req.params.id });
    res.json({ success: true, product: { ...updated, id: updated._id } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await Products.update({ _id: req.params.id }, { $set: { active: false } });
    res.json({ success: true, message: 'Product deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Products.findOne({ _id: req.params.id, active: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const existing = await Reviews.findOne({ productId: req.params.id, userId: req.user._id });
    if (existing) {
      await Reviews.update({ _id: existing._id }, { $set: { rating: parseInt(rating), comment } });
    } else {
      await Reviews.insert({ _id: uuidv4(), productId: req.params.id, userId: req.user._id, userName: req.user.name, rating: parseInt(rating), comment, createdAt: new Date() });
    }
    const reviews = await Reviews.find({ productId: req.params.id }, { createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const adminGetProducts = async (req, res) => {
  try {
    const products = await Products.find({}, { createdAt: -1 });
    res.json({ success: true, products: products.map(p=>({...p,id:p._id})) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, adminGetProducts };
