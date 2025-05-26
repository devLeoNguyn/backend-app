const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const {
  createUser,
  updateUser,
  deleteUser,
  uploadAvatar
} = require('../controllers/user.controller');

router.post('/', createUser);
router.put('/:id', auth, updateUser);
router.delete('/:id', auth, deleteUser);
router.patch('/:id/avatar', auth, upload.single('avatar'), uploadAvatar);

module.exports = router;
