const { convertContent, deleteCacheEntry } = require('../common/cache');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const { Page } = require('../models');
const Stream = require('stream');

async function search(req, res) {
  const type = Number(req.body.type);
  let types = [];
  if (type === undefined || type === -1) {
    types = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else {
    types.push(type);
  }

  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';

  let pages = [];
  let message = 'ok';
  let status = true;
  try {
    pages = await Page.findAll({
      where: {
        type: types,
        [Op.or]: [
          {
            title: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            description: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            tag: {
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

  res.json({ status, message, pages });
}

async function create(req, res) {
  req.app.locals.sitemap = undefined;
  let type = req.body.type;
  let link = req.body.link;
  let pageStatus = req.body.pageStatus;
  let commentStatus = req.body.commentStatus;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;
  let userId = req.session.user.id;
  let view = 0;
  let upVote = 0;
  let downVote = 0;

  let page;
  let message = 'ok';
  let status = false;
  let id;
  try {
    page = await Page.create({
      type,
      link,
      pageStatus,
      commentStatus,
      title,
      content,
      tag,
      description,
      password,
      view,
      upVote,
      downVote,
      UserId: userId
    });
    if (page) {
      id = page.id;
      status = true;
      convertContent(page, true);
    }
  } catch (e) {
    console.error(e);
    message = e.message;
  }

  res.json({ status, message, id });
}

async function getAll(req, res) {
  let pages;
  let status = true;
  let message = 'ok';
  try {
    pages = await Page.findAll({
      order: [sequelize.literal('"Page.updatedAt" DESC')]
    });
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
  }
  res.json({ status, message, pages });
}

async function export_(req, res, next) {
  const id = req.params.id;
  try {
    let page = await Page.findOne({ where: { id } });
    if (page) {
      const filename = page.link + '.md';
      res.setHeader(
        'Content-disposition',
        "attachment; filename*=UTF-8''" + encodeURIComponent(filename)
      );
      res.setHeader('Content-type', 'text/md');
      const fileStream = new Stream.Readable({
        read(size) {
          return true;
        }
      });
      fileStream.pipe(res);
      fileStream.push(page.content);
      res.end();
      return;
    }
  } catch (e) {
    console.error(e);
  }
  next();
}

async function get(req, res) {
  const id = req.params.id;
  let status = true;
  let message = 'ok';
  let page;

  try {
    page = await Page.findOne({
      where: { id }
    });
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
  }
  res.json({ status, message, page });
}

async function update(req, res, next) {
  req.app.locals.sitemap = undefined;
  let id = req.body.id;
  let type = req.body.type;
  let link = req.body.link;
  let pageStatus = req.body.pageStatus;
  let commentStatus = req.body.commentStatus;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;

  let newPage = {
    type,
    link,
    pageStatus,
    commentStatus,
    title,
    content,
    tag,
    description,
    password
  };

  let message = 'ok';
  let status = false;
  try {
    let page = await Page.findOne({
      where: { id }
    });
    if (page) {
      await page.update(newPage);
    }
    if (page) {
      status = true;
      convertContent(page, true);
    }
  } catch (e) {
    console.error(e);
    message = e.message;
  }

  // TODO: If we update the page notice, we should update sth to make it on index page.

  res.json({ status, message });
}

async function delete_(req, res) {
  req.app.locals.sitemap = undefined;
  const id = req.params.id;

  let status = false;
  let message = 'ok';
  try {
    let rows = await Page.destroy({
      where: {
        id
      }
    });
    status = rows === 1;
  } catch (e) {
    message = e.message;
  }
  deleteCacheEntry(id);

  res.json({ status, message });
}

module.exports = {
  search,
  create,
  getAll,
  export_,
  get,
  update,
  delete_
};
