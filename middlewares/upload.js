const multer = require('multer');
const path = require('path');
const { fileExists, getDate } = require('../common/util');
const uploadPath = require('../config').uploadPath;

exports.upload = multer({
  storage: multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, uploadPath);
    },
    filename: async function(req, file, callback) {
      file.originalname = file.originalname.replaceAll(" ", "_");
      if (await fileExists(path.join(uploadPath, path.basename(file.originalname)))) {
        let parts = file.originalname.split('.');
        let extension = "";
        if (parts.length > 1) {
          extension = parts.pop();
        }
        file.id = parts.join('.') + getDate("_yyyyMMddhhmmss");
        if (extension) {
          file.id += "." + extension;
        }
      } else {
        file.id = file.originalname;
      }
      callback(null, file.id);
    }
  })
});
