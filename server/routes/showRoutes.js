const express = require('express');
const router = express.Router();
const showController = require('../controllers/showController');
const { protect, restrictTo } = require('../controllers/authController');

router
    .route('/')
    .get(showController.getAllShows)
    .post(protect, showController.createShow);


router
    .route('/:id')
    .get(showController.getShowById)
    .patch(protect, restrictTo('Admin'), showController.updateShow)
    .delete(protect, restrictTo('Admin'), showController.deleteShow);

router
    .route('/:id/shows')
    .get(showController.getMovieDetailsWithShows)

module.exports = router;
