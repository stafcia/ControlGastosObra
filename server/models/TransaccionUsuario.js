const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const TransaccionUsuario = sequelize.define('TransaccionUsuario', {
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
  usuarioOrigenId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El usuario origen es requerido'
      }
    }
  },
  usuarioDestinoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El usuario destino es requerido'
      }
    }
  },
  tipoMovimiento: {
    type: DataTypes.ENUM('Ingreso', 'Egreso', 'Gasto'),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El tipo de movimiento es requerido'
      },
      isIn: {
        args: [['Ingreso', 'Egreso', 'Gasto']],
        msg: 'El tipo debe ser Ingreso, Egreso o Gasto'
      }
    }
  },
  tipoGasto: {
    type: DataTypes.ENUM('Obra', 'Proveedor', 'Otro'),
    allowNull: true,
    validate: {
      tipoGastoRequerido() {
        if (this.tipoMovimiento === 'Gasto' && !this.tipoGasto) {
          throw new Error('El tipo de gasto es requerido para movimientos de gasto');
        }
      }
    }
  },
  obraId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      obraRequeridaParaGastoObra() {
        if (this.tipoGasto === 'Obra' && !this.obraId) {
          throw new Error('La obra es requerida para gastos de obra');
        }
      }
    }
  },
  proveedorNombre: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      proveedorRequeridoParaGastoProveedor() {
        if (this.tipoGasto === 'Proveedor' && !this.proveedorNombre) {
          throw new Error('El nombre del proveedor es requerido para gastos de proveedor');
        }
      }
    }
  },
  concepto: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 1000],
        msg: 'El concepto debe tener máximo 1000 caracteres'
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
  estadoOrigen: {
    type: DataTypes.ENUM('Pendiente', 'Confirmado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Pendiente'
  },
  estadoDestino: {
    type: DataTypes.ENUM('Pendiente', 'Confirmado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Pendiente'
  },
  fechaConfirmacionOrigen: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fechaConfirmacionDestino: {
    type: DataTypes.DATE,
    allowNull: true
  },
  creadoPorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: {
        msg: 'El usuario creador es requerido'
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
  comprobantes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Array de rutas de archivos de comprobantes'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'TransaccionesUsuario',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    {
      fields: ['fecha', 'usuarioOrigenId']
    },
    {
      fields: ['fecha', 'usuarioDestinoId']
    },
    {
      fields: ['tipoMovimiento']
    },
    {
      fields: ['periodoId']
    },
    {
      fields: ['estadoOrigen', 'estadoDestino']
    },
    {
      fields: ['creadoPorId']
    }
  ]
});

// Definir relaciones
TransaccionUsuario.associate = function(models) {
  // Relación con Usuario Origen
  TransaccionUsuario.belongsTo(models.User, {
    foreignKey: 'usuarioOrigenId',
    as: 'usuarioOrigen',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Usuario Destino
  TransaccionUsuario.belongsTo(models.User, {
    foreignKey: 'usuarioDestinoId',
    as: 'usuarioDestino',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Usuario Creador
  TransaccionUsuario.belongsTo(models.User, {
    foreignKey: 'creadoPorId',
    as: 'creadoPor',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Obra
  TransaccionUsuario.belongsTo(models.Obra, {
    foreignKey: 'obraId',
    as: 'obra',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });

  // Relación con Período
  TransaccionUsuario.belongsTo(models.Periodo, {
    foreignKey: 'periodoId',
    as: 'periodo',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  });
};

// Métodos estáticos útiles
TransaccionUsuario.obtenerBalanceUsuario = async function(usuarioId, periodoId = null) {
  const whereConditions = {
    [Op.or]: [
      { usuarioOrigenId: usuarioId },
      { usuarioDestinoId: usuarioId }
    ],
    estadoOrigen: 'Confirmado',
    estadoDestino: 'Confirmado',
    activo: true
  };

  if (periodoId) {
    whereConditions.periodoId = periodoId;
  }

  const transacciones = await this.findAll({
    where: whereConditions
  });

  let ingresos = 0;
  let egresos = 0;
  let gastos = 0;

  transacciones.forEach(transaccion => {
    const monto = parseFloat(transaccion.monto);
    
    if (transaccion.usuarioDestinoId === usuarioId) {
      // El usuario recibe dinero - TODOS los tipos de movimiento cuentan como ingreso para quien recibe
      ingresos += monto;
    }
    
    if (transaccion.usuarioOrigenId === usuarioId) {
      // El usuario entrega dinero - clasificar según el tipo
      if (transaccion.tipoMovimiento === 'Ingreso') {
        // Si soy el origen de un "Ingreso", significa que estoy dando dinero a alguien
        egresos += monto;
      } else if (transaccion.tipoMovimiento === 'Egreso') {
        // Si soy el origen de un "Egreso", estoy transfiriendo dinero
        egresos += monto;
      } else if (transaccion.tipoMovimiento === 'Gasto') {
        // Si soy el origen de un "Gasto", es un gasto mío
        gastos += monto;
      }
    }
  });

  return {
    ingresos,
    egresos,
    gastos,
    balance: ingresos - egresos - gastos
  };
};

TransaccionUsuario.obtenerPendientesPorUsuario = async function(usuarioId) {
  return await this.findAll({
    where: {
      [Op.or]: [
        {
          usuarioOrigenId: usuarioId,
          estadoOrigen: 'Pendiente'
        },
        {
          usuarioDestinoId: usuarioId,
          estadoDestino: 'Pendiente'
        }
      ],
      activo: true
    },
    include: [
      {
        association: 'usuarioOrigen',
        attributes: ['id', 'nombreCompleto', 'nombreUsuario']
      },
      {
        association: 'usuarioDestino',
        attributes: ['id', 'nombreCompleto', 'nombreUsuario']
      },
      {
        association: 'obra',
        attributes: ['id', 'nombre', 'clienteNombre'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']]
  });
};

module.exports = TransaccionUsuario;
// Fixed associations and balance calculation

// Sincronizar la tabla
TransaccionUsuario.sync({ alter: true })
  .then(() => {
    console.log('La tabla "TransaccionesUsuario" ha sido sincronizada correctamente.');
  })
  .catch((error) => {
    console.error('Error al sincronizar la tabla "TransaccionesUsuario":', error);
  });