const express = require('express');
const router = express.Router();
const screenController = require('../controllers/screenController');
const authController = require('../controllers/authController');


router
    .route('/:id')
    .get(screenController.getScreen)
    .patch(authController.protect, authController.restrictTo('Admin'), screenController.updateScreen)
    .delete(authController.protect, authController.restrictTo('Admin'), screenController.deleteScreen);

module.exports = router;
