'use strict';
const express = require('express');
const router = express.Router();
//const Page = require('../models/page').Page;
const checkLogin = require('../middlewares/check').checkLogin;
const checkPermission = require('../middlewares/check').checkPermission;

module.exports = router;
