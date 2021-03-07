const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class Option extends Model {}

Option.init(
  {
    key: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    value: DataTypes.TEXT
  },
  { sequelize, timestamps: false }
);

module.exports = Option;
