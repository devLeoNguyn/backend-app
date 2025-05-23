var express = require('express');
var router = express.Router();
const User = require('../models/User'); 

/* GET users listing. */
router.get('/users', async (req, res) => {
  const users = await User.find();

  res.render('users', { users });
});

module.exports = router;
