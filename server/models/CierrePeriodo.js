const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CierrePeriodo = sequelize.define('CierrePeriodo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  periodoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'periodos',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Usuario al que se le cierra el período'
  },
  cerradoPorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Administrador que realizó el cierre'
  },
  fechaCierre: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Notas o comentarios sobre el cierre'
  },
}, {
  tableName: 'cierres_periodo',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['periodoId', 'userId'],
      name: 'idx_unique_periodo_usuario'
    },
    {
      fields: ['userId']
    },
    {
      fields: ['periodoId']
    },
    {
      fields: ['cerradoPorId']
    },
    {
      fields: ['fechaCierre']
    }
  ]
});

// Método de instancia para verificar si un usuario tiene un período cerrado
CierrePeriodo.estaCerradoParaUsuario = async function(periodoId, userId) {
  const cierre = await CierrePeriodo.findOne({
    where: {
      periodoId: periodoId,
      userId: userId
    }
  });
  return cierre !== null;
};

// Método para obtener usuarios con períodos sin cerrar
CierrePeriodo.obtenerUsuariosSinCerrar = async function(periodoId) {
  const User = require('./user');
  const { Op } = require('sequelize');
  
  // Obtener usuarios que ya tienen el período cerrado
  const usuariosConCierre = await CierrePeriodo.findAll({
    where: { periodoId },
    attributes: ['userId']
  });
  
  const userIdsCerrados = usuariosConCierre.map(c => c.userId);
  
  // Retornar usuarios activos que NO tienen el período cerrado
  return await User.findAll({
    where: {
      id: { [Op.notIn]: userIdsCerrados },
      activo: true
    },
    attributes: ['id', 'nombreUsuario', 'nombreCompleto', 'correo']
  });
};

// Método para obtener el resumen de cierres de un período
CierrePeriodo.obtenerResumenPeriodo = async function(periodoId) {
  const User = require('./user');
  
  const totalUsuarios = await User.count({ where: { activo: true } });
  const usuariosCerrados = await CierrePeriodo.count({ where: { periodoId } });
  
  const cierres = await CierrePeriodo.findAll({
    where: { periodoId },
    include: [
      {
        model: User,
        as: 'usuario',
        attributes: ['nombreUsuario', 'nombreCompleto']
      },
      {
        model: User,
        as: 'cerradoPor',
        attributes: ['nombreUsuario', 'nombreCompleto']
      }
    ],
    order: [['fechaCierre', 'DESC']]
  });
  
  return {
    totalUsuarios,
    usuariosCerrados,
    usuariosPendientes: totalUsuarios - usuariosCerrados,
    porcentajeCompletado: totalUsuarios > 0 ? ((usuariosCerrados / totalUsuarios) * 100).toFixed(2) : 0,
    cierres
  };
};

// Método para realizar cierre de período para un usuario
CierrePeriodo.cerrarPeriodoParaUsuario = async function(periodoId, userId, cerradoPorId, observaciones = null) {
  // Verificar si ya está cerrado
  const cierreExistente = await CierrePeriodo.findOne({
    where: { periodoId, userId }
  });
  
  if (cierreExistente) {
    throw new Error('El período ya está cerrado para este usuario');
  }
  
  return await CierrePeriodo.create({
    periodoId,
    userId,
    cerradoPorId,
    observaciones
  });
};

module.exports = CierrePeriodo;