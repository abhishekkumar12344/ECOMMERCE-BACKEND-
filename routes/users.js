// routes/users.js
const express = require('express');
const router = express.Router();
const { getAllUsers, getUser, updateUserRole, deleteUser, getDashboardStats } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/dashboard/stats', protect, adminOnly, getDashboardStats);
router.get('/', protect, adminOnly, getAllUsers);
router.get('/:id', protect, adminOnly, getUser);
router.put('/:id/role', protect, adminOnly, updateUserRole);
router.delete('/:id', protect, adminOnly, deleteUser);

module.exports = router;
