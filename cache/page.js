const { Page, User } = require('../models');

let pages = undefined;

async function loadAllPages() {
  pages = await Page.findAll({ include: User });
}

async function getPagesByRange(start, num) {
  if (!pages) {
    await loadAllPages();
  }
  return pages.slice(start, start + num);
}

module.exports = {
  getPagesByRange
};
