const { Op } = require('sequelize');
const { File } = require('../models');
const uploadPath = require('../config').uploadPath;
const fs = require('fs');
const path = require('path');

async function getAll(req, res, next) {
  let files = [];
  let message = 'ok';
  let status = true;
  try {
    files = await File.findAll({ order: [['updatedAt', 'DESC']], raw: true });
  } catch (e) {
    status = false;
    message = e.message;
  }
  res.json({ status, message, files });
}

async function upload(req, res) {
  const { file } = req;
  const newFile = {
    description: req.body.description,
    filename: file.originalname,
    path: '/upload/' + file.filename,
    id: file.id
  };
  let status = false;
  let message = 'ok';
  try {
    let file = await File.create(newFile);
    status = file !== null;
  } catch (e) {
    message = e.message;
    console.error(message);
  }
  res.json({ status, message, file: newFile });
}

async function get(req, res, next) {
  const id = req.params.id;
  let file;
  let status = false;
  let message = 'ok';
  try {
    file = await File.findOne({
      where: {
        id
      },
      raw: true
    });
    status = file !== null;
  } catch (e) {
    message = e.message;
  }
  res.json({ status, message, file });
}

async function delete_(req, res, next) {
  const id = req.params.id;
  let status = false;
  let message = 'ok';
  try {
    let rows = await File.destroy({
      where: {
        id
      }
    });
    status = rows === 1;
    let filePath = path.join(uploadPath, id);
    fs.unlink(filePath, error => {
      if (error) {
        console.error(error);
      }
    });
  } catch (e) {
    message = e.message;
  }

  res.json({ status, message });
}

async function search(req, res, next) {
  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';
  let files = [];
  let message = 'ok';
  let status = true;
  try {
    files = await File.findAll({
      where: {
        [Op.or]: [
          {
            filename: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            description: {
              [Op.like]: `%${keyword}%`
            }
          }
        ]
      }
    });
  } catch (e) {
    status = false;
    message = e.message;
    console.error(e);
  }
  res.json({
    status,
    message,
    files
  });
}

module.exports = {
  getAll,
  upload,
  get,
  delete_,
  search
};
