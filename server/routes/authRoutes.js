const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/me', authController.protect, authController.getMe);
router.patch('/me', authController.protect, authController.updateMe);
router.post('/register', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);


module.exports = router;