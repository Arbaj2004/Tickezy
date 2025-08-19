const express = require('express');
const router = express.Router();
const theatreController = require('../controllers/theatreController');
const screenController = require('../controllers/screenController');
const { protect, restrictTo } = require('../controllers/authController');

router.post('/', protect, restrictTo('Admin'), theatreController.createTheatre);
router.get('/', theatreController.getAllTheatres);
router.get('/:id', theatreController.getTheatre);
router.patch('/:id', protect, theatreController.updateTheatre);
router.delete('/:id', protect, restrictTo('Admin'), theatreController.deleteTheatre);

// Only admin can create/update/delete
router
    .route('/:theatreId/screens')
    .post(protect, restrictTo('Admin'), screenController.createScreen)
    .get(screenController.getScreensByTheatre);


module.exports = router;