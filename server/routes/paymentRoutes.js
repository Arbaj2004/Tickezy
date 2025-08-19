const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../controllers/authController');
const paymentController = require('../controllers/paymentController');

// Create a dummy payment session (5 minute TTL)
router.post('/session', protect, restrictTo('User'), paymentController.createSession);

// Get payment session details
router.get('/session/:id', protect, restrictTo('User'), paymentController.getSession);

// Confirm payment (finalize booking, clear holds)
router.post('/confirm', protect, restrictTo('User'), paymentController.confirm);

// Cancel payment session (release holds)
router.post('/cancel', protect, restrictTo('User'), paymentController.cancel);

module.exports = router;
