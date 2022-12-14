const express = require('express');
const router = express.Router();

const index = require('../controllers/index');

router.get('/', index.getIndex);
router.get('/archive', index.getArchive);
router.get('/archive/:year/:month', index.getMonthArchive);
router.get('/sitemap.xml', index.getSitemap);
router.get('/tag/:tag', index.getTag);
router.get('/page/:link', index.getPage);
router.get(/static\/.*/, index.getStaticFile);

module.exports = router;
