const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movimiento = sequelize.define('Movimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'La fecha es requerida'
      },
      isDate: {
        msg: 'Debe ser una fecha válida'
      }
    }
  },
  obraId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'La obra es requerida'
      }
    }
  },
  tipo: {
    type: DataTypes.ENUM('Ingreso', 'Egreso'),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El tipo de movimiento es requerido'
      },
      isIn: {
        args: [['Ingreso', 'Egreso']],
        msg: 'El tipo debe ser Ingreso o Egreso'
      }
    }
  },
  formaPago: {
    type: DataTypes.ENUM('Efectivo', 'Cheque Cliente', 'Cheque Cta Obra', 'Transferencia Obra', 'Transferencia Brahma'),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'La forma de pago es requerida'
      },
      isIn: {
        args: [['Efectivo', 'Cheque Cliente', 'Cheque Cta Obra', 'Transferencia Obra', 'Transferencia Brahma']],
        msg: 'Forma de pago inválida'
      }
    }
  },
  monto: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El monto es requerido'
      },
      isDecimal: {
        msg: 'El monto debe ser un número válido'
      },
      min: {
        args: [0.01],
        msg: 'El monto debe ser mayor a 0'
      }
    }
  },
  concepto: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El concepto es requerido'
      },
      len: {
        args: [1, 1000],
        msg: 'El concepto debe tener entre 1 y 1000 caracteres'
      }
    }
  },
  comprobantes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Array de rutas de archivos de comprobantes'
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
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'Movimientos',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['fecha', 'obraId']
    },
    {
      fields: ['tipo']
    },
    {
      fields: ['periodoId']
    },
    {
      fields: ['userId']
    }
  ]
});

// Definir relaciones
Movimiento.associate = function(models) {
  // Relación con Obra
  Movimiento.belongsTo(models.Obra, {
    foreignKey: 'obraId',
    as: 'obra',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Usuario
  Movimiento.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'usuario',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Período
  Movimiento.belongsTo(models.Periodo, {
    foreignKey: 'periodoId',
    as: 'periodo',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });
};

// Métodos estáticos útiles
Movimiento.obtenerResumenPorPeriodo = async function(periodoId) {
  const [ingresos, egresos] = await Promise.all([
    this.sum('monto', {
      where: {
        periodoId,
        tipo: 'Ingreso',
        activo: true
      }
    }),
    this.sum('monto', {
      where: {
        periodoId,
        tipo: 'Egreso',
        activo: true
      }
    })
  ]);

  return {
    ingresos: ingresos || 0,
    egresos: egresos || 0,
    balance: (ingresos || 0) - (egresos || 0)
  };
};

Movimiento.obtenerResumenPorObra = async function(obraId, periodoId = null) {
  const whereConditions = {
    obraId,
    activo: true
  };

  if (periodoId) {
    whereConditions.periodoId = periodoId;
  }

  const [ingresos, egresos] = await Promise.all([
    this.sum('monto', {
      where: { ...whereConditions, tipo: 'Ingreso' }
    }),
    this.sum('monto', {
      where: { ...whereConditions, tipo: 'Egreso' }
    })
  ]);

  return {
    ingresos: ingresos || 0,
    egresos: egresos || 0,
    balance: (ingresos || 0) - (egresos || 0)
  };
};

module.exports = Movimiento;