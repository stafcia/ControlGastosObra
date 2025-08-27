const User = require('./user');
const UserType = require('./userType');
const Obra = require('./obra');
const Periodo = require('./Periodo');
const CierrePeriodo = require('./CierrePeriodo');

// Establecer asociaciones existentes
User.belongsTo(UserType, {
  foreignKey: 'userTypeId',
  as: 'userType'
});

UserType.hasMany(User, {
  foreignKey: 'userTypeId',
  as: 'users'
});

// Asociaciones para CierrePeriodo
CierrePeriodo.belongsTo(Periodo, {
  foreignKey: 'periodoId',
  as: 'periodo'
});

CierrePeriodo.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

CierrePeriodo.belongsTo(User, {
  foreignKey: 'cerradoPorId',
  as: 'cerradoPor'
});

Periodo.hasMany(CierrePeriodo, {
  foreignKey: 'periodoId',
  as: 'cierres'
});

User.hasMany(CierrePeriodo, {
  foreignKey: 'userId',
  as: 'cierresPeriodo'
});

module.exports = {
  User,
  UserType,
  Obra,
  Periodo,
  CierrePeriodo
};