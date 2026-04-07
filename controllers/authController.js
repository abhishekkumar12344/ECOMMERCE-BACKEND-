const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Users } = require('../config/db');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password required' });
    const existing = await Users.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });
    const id = uuidv4();
    const hashedPassword = bcrypt.hashSync(password, 10);
    await Users.insert({ _id: id, name, email, password: hashedPassword, phone: phone||'', address: address||'', role: 'user', createdAt: new Date() });
    const user = await Users.findOne({ _id: id });
    const { password: _, ...safe } = user;
    res.status(201).json({ success: true, token: generateToken(id), user: safe });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await Users.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const { password: _, ...safe } = user;
    res.json({ success: true, token: generateToken(user._id), user: safe });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getMe = async (req, res) => {
  const { password: _, ...safe } = req.user;
  res.json({ success: true, user: safe });
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await Users.update({ _id: req.user._id }, { $set: { name: name||req.user.name, phone: phone||req.user.phone, address: address||req.user.address } });
    const user = await Users.findOne({ _id: req.user._id });
    const { password: _, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await Users.findOne({ _id: req.user._id });
    if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    await Users.update({ _id: req.user._id }, { $set: { password: bcrypt.hashSync(newPassword, 10) } });
    res.json({ success: true, message: 'Password changed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
