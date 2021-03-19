const Sequelize = require('sequelize');
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');
const { PAGE_TYPES, PAGE_STATUS } = require('../common/constant');

class Page extends Model {}

Page.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.INTEGER,
      defaultValue: PAGE_TYPES.ARTICLE
    },
    link: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pageStatus: {
      type: DataTypes.INTEGER,
      defaultValue: PAGE_STATUS.PUBLISHED
    },
    commentStatus: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tag: DataTypes.STRING,
    password: DataTypes.STRING,
    view: DataTypes.INTEGER,
    upVote: DataTypes.INTEGER,
    downVote: DataTypes.INTEGER,
    description: DataTypes.TEXT,
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.NOW
    }
  },
  { sequelize, updatedAt: false }
);

module.exports = Page;
