'use strict';
const express = require('express');
const router = express.Router();
const File = require('../models/file').File;
const multer = require('multer');
const uuid = require('uuid/v1');
const checkPermission = require('../middlewares/auth').adminRequired;
const upload_path = require('../models/file').upload_path;

router.get('/', checkPermission, (req, res, next) => {
  File.all((status, message, files) => {
    res.json({ status, message, files });
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, upload_path);
    },
    filename: function(req, file, callback) {
      let extension = file.originalname.split('.').pop();
      file.id = uuid() + '.' + extension;
      callback(null, file.id);
    }
  })
});

router.post('/', checkPermission, upload.single('file'), (req, res, next) => {
  const { file } = req;
  const newFile = {
    description: req.body.description ? req.body.description : 'No description',
    filename: file.originalname,
    path: '/upload/' + file.filename,
    id: file.id
  };
  File.add(newFile, (status, message) => {
    res.json({ status, message, file: newFile });
  });
});

router.get('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  File.getById(id, (status, message, file) => {
    res.json({ status, message, file });
  });
});

router.delete('/:id', checkPermission, (req, res, next) => {
  const id = req.params.id;
  File.deleteById(id, (status, message) => {
    res.json({ status, message });
  });
});

router.post('/search', checkPermission, function(req, res, next) {
  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';
  File.search(keyword, (status, message, files) => {
    res.json({
      status,
      message,
      files
    });
  });
});

module.exports = router;
