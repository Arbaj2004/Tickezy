const express = require('express');
const router = express.Router();
const tempController = require('../controllers/temp');

router.post('/test-db', tempController.testDB);


module.exports = router;