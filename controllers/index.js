const { getPagesByRange } = require('../cache/page');
const { Page } = require('../models');

async function getIndexPage(req, res, next) {
  let page = parseInt(req.query.p);
  if (!page || page <= 0) {
    page = 0;
  }
  let pageSize = 10;
  let start = page * pageSize;
  let pages = await getPagesByRange(start, pageSize);
  res.render('index', {
    pages: pages,
    prev: `?p=${page - 1}`,
    next: `?p=${page + 1}`
  });
}

module.exports = {
  getIndexPage
};
