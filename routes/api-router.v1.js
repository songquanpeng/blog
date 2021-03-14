const express = require('express');
const router = express.Router();
const { userRequired, adminRequired } = require('../middlewares/api_auth');

const page = require('../controllers/page');
const user = require('../controllers/user');
const option = require('../controllers/option');
const file = require('../controllers/file');

router.post('/page/search', userRequired, page.search);
router.post('/page', userRequired, page.create);
router.get('/page', userRequired, page.getAll);
router.get('/page/export/:id', userRequired, page.export_);
router.get('/page/:id', userRequired, page.get);
router.put('/page', userRequired, page.update);
router.delete('/page', userRequired, page.delete_);

router.post('/user/login', user.login);
router.get('/user/logout', user.logout);
router.get('/user/status', userRequired, user.status);
router.put('/user', adminRequired, user.update);
router.get('/user', adminRequired, user.getAll);
router.get('/user/:id', adminRequired, user.get);
router.post('/user', adminRequired, user.create);
router.delete('/user/:id', adminRequired, user.delete_);

router.get('/option', adminRequired, option.getAll);
router.post('/option/search', adminRequired, option.search);
router.get('/option/shutdown', adminRequired, option.shutdown);
router.get('/option/:name', adminRequired, option.get);
//TODO: The origin method is post!!! don't forget modify the admin!
router.put('/option', adminRequired, option.update);
router.delete('/option', adminRequired, option.delete_);

router.get('/file', adminRequired, file.getAll);
router.post('/file', adminRequired, file.upload);
router.get('/file/:id', adminRequired, file.get);
router.delete('/file/:id', adminRequired, file.delete_);
router.post('/file/search', adminRequired, file.search);

module.exports = router;
