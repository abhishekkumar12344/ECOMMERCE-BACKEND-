const express = require('express');
const router = express.Router();
const { submitContact, getMessages, markAsRead, deleteMessage } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/', submitContact);
router.get('/', protect, adminOnly, getMessages);
router.put('/:id/read', protect, adminOnly, markAsRead);
router.delete('/:id', protect, adminOnly, deleteMessage);

module.exports = router;
