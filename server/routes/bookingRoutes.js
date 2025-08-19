const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// All routes require login
router.use(protect);

// 📦 Book a show
router.post('/', bookingController.createBooking);

// 👤 Get logged-in user's bookings
router.get('/my', bookingController.getMyBookings);

// 🔐 Admin: Analytics (place before dynamic :id route)
router.get('/analytics', restrictTo('Admin'), bookingController.getAnalytics);

// 🔐 Get one booking (owner or admin)
router.get('/:id', bookingController.getBookingById);

// 🔐 Admin: Get all bookings
router.get('/', restrictTo('Admin'), bookingController.getAllBookings);

module.exports = router;
