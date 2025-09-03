const User = require('./user');
const UserType = require('./userType');
const Obra = require('./obra');
const Periodo = require('./Periodo');
const CierrePeriodo = require('./CierrePeriodo');
const Movimiento = require('./Movimiento');
const TransaccionUsuario = require('./TransaccionUsuario');
const BalanceUsuario = require('./BalanceUsuario');

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

// Asociaciones para Movimiento
Movimiento.belongsTo(Obra, {
  foreignKey: 'obraId',
  as: 'obra'
});

Movimiento.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

Movimiento.belongsTo(Periodo, {
  foreignKey: 'periodoId',
  as: 'periodo'
});

Obra.hasMany(Movimiento, {
  foreignKey: 'obraId',
  as: 'movimientos'
});

User.hasMany(Movimiento, {
  foreignKey: 'userId',
  as: 'movimientos'
});

Periodo.hasMany(Movimiento, {
  foreignKey: 'periodoId',
  as: 'movimientos'
});

// Asociaciones para TransaccionUsuario
TransaccionUsuario.belongsTo(User, {
  foreignKey: 'usuarioOrigenId',
  as: 'usuarioOrigen'
});

TransaccionUsuario.belongsTo(User, {
  foreignKey: 'usuarioDestinoId',
  as: 'usuarioDestino'
});

TransaccionUsuario.belongsTo(User, {
  foreignKey: 'creadoPorId',
  as: 'creadoPor'
});

TransaccionUsuario.belongsTo(Obra, {
  foreignKey: 'obraId',
  as: 'obra'
});

TransaccionUsuario.belongsTo(Periodo, {
  foreignKey: 'periodoId',
  as: 'periodo'
});

User.hasMany(TransaccionUsuario, {
  foreignKey: 'usuarioOrigenId',
  as: 'transaccionesOrigen'
});

User.hasMany(TransaccionUsuario, {
  foreignKey: 'usuarioDestinoId',
  as: 'transaccionesDestino'
});

User.hasMany(TransaccionUsuario, {
  foreignKey: 'creadoPorId',
  as: 'transaccionesCreadas'
});

Obra.hasMany(TransaccionUsuario, {
  foreignKey: 'obraId',
  as: 'transaccionesUsuarios'
});

Periodo.hasMany(TransaccionUsuario, {
  foreignKey: 'periodoId',
  as: 'transaccionesUsuarios'
});

// Asociaciones para BalanceUsuario
BalanceUsuario.belongsTo(User, {
  foreignKey: 'userId',
  as: 'usuario'
});

BalanceUsuario.belongsTo(Periodo, {
  foreignKey: 'periodoId',
  as: 'periodo'
});

User.hasMany(BalanceUsuario, {
  foreignKey: 'userId',
  as: 'balances'
});

Periodo.hasMany(BalanceUsuario, {
  foreignKey: 'periodoId',
  as: 'balances'
});

module.exports = {
  User,
  UserType,
  Obra,
  Periodo,
  CierrePeriodo,
  Movimiento,
  TransaccionUsuario,
  BalanceUsuario
};