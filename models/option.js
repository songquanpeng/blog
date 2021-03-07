const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class Option extends Model {}

Option.init(
  {
    name: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    value: DataTypes.TEXT,
    description: DataTypes.TEXT
  },
  { sequelize }
);

module.exports = Option;
