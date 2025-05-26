const express = require('express');
const router = express.Router();
const { saveOrUpdateWatching, getWatchingList } = require('../controllers/watching.controller');

router.get('/:user_id', getWatchingList);
// Cập nhật trạng thái xem
router.post('/', saveOrUpdateWatching);

module.exports = router;
