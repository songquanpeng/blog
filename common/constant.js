const PAGE_TYPES = {
  ARTICLE: 0,
  CODE: 1,
  BULLETIN: 2,
  DISCUSS: 3,
  LINKS: 4,
  RAW: 5,
  MEDIA: 6,
  TIMELINE: 7,
  REDIRECT: 8,
  TEXT: 9
};

const PAGE_STATUS = {
  RECALLED: 0,
  PUBLISHED: 1,
  TOPPED: 2,
  HIDDEN: 3
};

module.exports = { PAGE_TYPES, PAGE_STATUS };
