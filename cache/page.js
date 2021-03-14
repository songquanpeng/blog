const { Page, User } = require('../models');
const { PAGE_STATUS } = require('../common/constant');
const sequelize = require('../common/database');
const { Op } = require('sequelize');

let pages = undefined;

async function loadAllPages() {
  // TODO: the password & token of user shouldn't be load!
  try {
    pages = await Page.findAll({
      where: {
        [Op.or]: [
          { pageStatus: PAGE_STATUS.PUBLISHED },
          { pageStatus: PAGE_STATUS.TOPPED }
        ]
      },
      order: [sequelize.literal('"Page.updatedAt" DESC')],
      include: User
    });
  } catch (e) {
    console.log('Failed to load all pages!');
    console.error(e);
  }
}

async function getPagesByRange(start, num) {
  if (pages === undefined) {
    await loadAllPages();
  }
  return pages.slice(start, start + num);
}

module.exports = {
  getPagesByRange
};
