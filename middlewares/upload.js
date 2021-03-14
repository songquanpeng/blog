const multer = require('multer');
const uuid = require('uuid/v1');
const uploadPath = require('../config').uploadPath;

exports.upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, uploadPath);
    },
    filename: function(req, file, callback) {
      let extension = file.originalname.split('.').pop();
      file.id = uuid() + '.' + extension;
      callback(null, file.id);
    }
  })
});
