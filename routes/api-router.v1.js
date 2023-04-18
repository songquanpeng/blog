const express = require('express');
const router = express.Router();
const { userRequired, adminRequired, tokenAuth } = require('../middlewares/api-auth');
const { upload } = require('../middlewares/upload');

const page = require('../controllers/page');
const user = require('../controllers/user');
const option = require('../controllers/option');
const file = require('../controllers/file');

router.post('/page/search', userRequired, page.search);
router.post('/page', tokenAuth, userRequired, page.create);
router.get('/page', userRequired, page.getAll);
router.get('/page/export/:id', userRequired, page.export_);
router.get('/page/render/:id', page.getRenderedPage);
router.get('/page/:id', userRequired, page.get);
router.put('/page', userRequired, page.update);
router.delete('/page/:id', userRequired, page.delete_);

router.post('/user/login', user.login);
router.get('/user/logout', user.logout);
router.get('/user/status', userRequired, user.status);
router.post('/user/refresh_token', userRequired, user.refreshToken);
router.put('/user', adminRequired, user.update);
router.get('/user', adminRequired, user.getAll);
router.get('/user/:id', adminRequired, user.get);
router.post('/user', adminRequired, user.create);
router.delete('/user/:id', adminRequired, user.delete_);

router.get('/option', adminRequired, option.getAll);
router.get('/option/shutdown', adminRequired, option.shutdown);
router.get('/option/:name', adminRequired, option.get);
router.put('/option', adminRequired, option.update);

router.get('/file', adminRequired, file.getAll);
router.post('/file', adminRequired, upload.single('file'), file.upload);
router.get('/file/:id', adminRequired, file.get);
router.delete('/file/:id', adminRequired, file.delete_);
router.post('/file/search', adminRequired, file.search);

module.exports = router;
