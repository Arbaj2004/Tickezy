const express = require('express');
const router = express.Router();
const showSeatController = require('../controllers/showSeatController');
const { protect, restrictTo } = require('../controllers/authController');

// Admin: Add seats to a show
router.post('/', protect, restrictTo('Admin'), showSeatController.createShowSeats);

// Public: Get seat layout for a show
router.get('/:showId', showSeatController.getSeatsByShow);

// User: Book seats
router.post('/book', protect, restrictTo('User'), showSeatController.bookSeats);

router.post('/hold', protect, showSeatController.holdSeats);
router.post('/validate-then-hold', protect, showSeatController.validateThenHold);
router.post('/release', protect, showSeatController.releaseHolds);
router.post('/validate', protect, showSeatController.validateHolds);

// User: Get current holds summary
router.get('/me/holds', protect, showSeatController.getUserHolds);

module.exports = router;
