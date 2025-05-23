const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('Welcome to the Movie Backend API!');
});

module.exports = router;
