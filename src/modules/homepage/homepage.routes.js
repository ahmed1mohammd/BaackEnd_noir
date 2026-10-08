const express = require('express');
const HomepageController = require('./homepage.controller');

const router = express.Router();

router.get('/', HomepageController.getHomepage);

module.exports = router;
