const { convertContent } = require('../common/util');
const { Op } = require('sequelize');
const { Page, User } = require('../models');

async function search(req, res, next) {
  const type = Number(req.body.type);
  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';

  let pages = [];
  let message = 'ok';
  let status = true;
  try {
    pages = await Page.findAll({
      where: {}
    });
  } catch (e) {}

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
async function getAll(req, res, next) {}
async function export_(req, res, next) {}
async function get(req, res, next) {}
async function update(req, res, next) {}
async function delete_(req, res, next) {}

module.exports = {
  search,
  create,
  getAll,
  export_,
  get,
  update,
  delete_
};
