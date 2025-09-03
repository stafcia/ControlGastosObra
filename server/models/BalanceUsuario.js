const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BalanceUsuario = sequelize.define('BalanceUsuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El usuario es requerido'
      }
    }
  },
  periodoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El período es requerido'
      }
    }
  },
  totalIngresos: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  totalEgresos: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  totalGastos: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  balance: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.totalIngresos) - parseFloat(this.totalEgresos) - parseFloat(this.totalGastos);
    }
  },
  ultimaActualizacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'BalancesUsuario',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'periodoId']
    },
    {
      fields: ['periodoId']
    }
  ]
});

// Definir relaciones
BalanceUsuario.associate = function(models) {
  // Relación con Usuario
  BalanceUsuario.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'usuario',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  // Relación con Período
  BalanceUsuario.belongsTo(models.Periodo, {
    foreignKey: 'periodoId',
    as: 'periodo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
};

// Métodos estáticos útiles
BalanceUsuario.actualizarBalance = async function(userId, periodoId) {
  const TransaccionUsuario = require('./TransaccionUsuario');
  
  // Calcular balance usando el método del modelo TransaccionUsuario
  const balance = await TransaccionUsuario.obtenerBalanceUsuario(userId, periodoId);
  
  // Buscar o crear el registro de balance
  const [balanceRecord, created] = await this.findOrCreate({
    where: { userId, periodoId },
    defaults: {
      totalIngresos: balance.ingresos,
      totalEgresos: balance.egresos,
      totalGastos: balance.gastos,
      ultimaActualizacion: new Date()
    }
  });

  // Si ya existía, actualizarlo
  if (!created) {
    await balanceRecord.update({
      totalIngresos: balance.ingresos,
      totalEgresos: balance.egresos,
      totalGastos: balance.gastos,
      ultimaActualizacion: new Date()
    });
  }

  return balanceRecord;
};

BalanceUsuario.obtenerBalancesDelPeriodo = async function(periodoId) {
  return await this.findAll({
    where: { periodoId },
    include: [
      {
        association: 'usuario',
        attributes: ['id', 'nombreCompleto', 'nombreUsuario']
      }
    ],
    order: [['totalIngresos', 'DESC']]
  });
};

BalanceUsuario.obtenerHistorialUsuario = async function(userId) {
  return await this.findAll({
    where: { userId },
    include: [
      {
        association: 'periodo',
        attributes: ['id', 'descripcion', 'fechaInicio', 'fechaFin']
      }
    ],
    order: [['periodoId', 'DESC']]
  });
};

module.exports = BalanceUsuario;

// Sincronizar la tabla
BalanceUsuario.sync({ alter: true })
  .then(() => {
    console.log('La tabla "BalancesUsuario" ha sido sincronizada correctamente.');
  })
  .catch((error) => {
    console.error('Error al sincronizar la tabla "BalancesUsuario":', error);
  });