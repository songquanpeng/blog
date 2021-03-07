const { Page, User } = require('../models');
const { PAGE_STATUS } = require('../common/constant');

let pages = undefined;

async function loadAllPages() {
  pages = await Page.findAll({
    where: {
      $or: [{ status: PAGE_STATUS.PUBLISHED }, { status: PAGE_STATUS.TOPPED }]
    },
    order: '"updatedAt" DESC',
    include: User
  });
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
