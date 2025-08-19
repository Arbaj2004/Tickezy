const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { protect, restrictTo } = require('../controllers/authController');
router
    .route('/')
    .get(movieController.getAllMovies)
    .post(protect, restrictTo('Admin'), movieController.createMovie);

router
    .route('/:id')
    .get(movieController.getMovieById)
    .patch(protect, restrictTo('Admin'), movieController.updateMovie)
    .delete(protect, restrictTo('Admin'), movieController.deleteMovie);

module.exports = router;
