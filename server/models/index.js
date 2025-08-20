const User = require('./user');
const UserType = require('./userType');
const Obra = require('./obra');

// Establecer asociaciones
User.belongsTo(UserType, {
  foreignKey: 'userTypeId',
  as: 'userType'
});

UserType.hasMany(User, {
  foreignKey: 'userTypeId',
  as: 'users'
});

module.exports = {
  User,
  UserType,
  Obra
};