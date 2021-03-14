const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class File extends Model {}

File.init(
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    description: DataTypes.TEXT,
    path: DataTypes.STRING,
    filename: DataTypes.STRING
  },
  { sequelize }
);

module.exports = File;
