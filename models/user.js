const { DataTypes, Model } = require('sequelize');
const sequelize = require('../common/database');

class User extends Model {}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      unique: true
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    accessToken: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    email: {
      type: DataTypes.STRING,
      unique: true
    },
    url: DataTypes.STRING,
    avatar: DataTypes.STRING,
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isModerator: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  },
  { sequelize }
);

module.exports = User;
