const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const Periodo = sequelize.define('Periodo', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true
    }
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true,
      isAfterStartDate(value) {
        if (this.fechaInicio && value <= this.fechaInicio) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }
      }
    }
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 24 // Máximo 24 períodos quincenales al año
    }
  },
  año: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2100
    }
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Ejemplo: Primera quincena de Enero 2025'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si es el período actualmente en curso'
  }
}, {
  tableName: 'periodos',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['año', 'numero']
    },
    {
      fields: ['fechaInicio']
    },
    {
      fields: ['fechaFin']
    },
    {
      fields: ['activo']
    }
  ],
  hooks: {
    beforeCreate: async (periodo) => {
      // Si se marca como activo, desactivar todos los demás
      if (periodo.activo) {
        await Periodo.update({ activo: false }, { where: { activo: true } });
      }
    },
    beforeUpdate: async (periodo) => {
      // Si se marca como activo, desactivar todos los demás
      if (periodo.activo && periodo.changed('activo')) {
        await Periodo.update({ activo: false }, { where: { activo: true, id: { [Op.ne]: periodo.id } } });
      }
    }
  }
});

// Método de clase para generar períodos quincenales de un año
Periodo.generarPeriodosAnuales = async function(año) {
  const periodos = [];
  let numeroPeriodo = 1;
  
  for (let mes = 1; mes <= 12; mes++) {
    const nombreMes = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ][mes - 1];
    
    // Primera quincena (del 1 al 15)
    periodos.push({
      fechaInicio: new Date(año, mes - 1, 1),
      fechaFin: new Date(año, mes - 1, 15),
      numero: numeroPeriodo++,
      año: año,
      descripcion: `Primera quincena de ${nombreMes} ${año}`,
      activo: false
    });
    
    // Segunda quincena (del 16 al último día del mes)
    const ultimoDiaMes = new Date(año, mes, 0).getDate();
    periodos.push({
      fechaInicio: new Date(año, mes - 1, 16),
      fechaFin: new Date(año, mes - 1, ultimoDiaMes),
      numero: numeroPeriodo++,
      año: año,
      descripcion: `Segunda quincena de ${nombreMes} ${año}`,
      activo: false
    });
  }
  
  return await Periodo.bulkCreate(periodos);
};

// Método para obtener el período actual basado en la fecha
Periodo.obtenerPeriodoActual = async function() {
  const hoy = new Date();
  return await Periodo.findOne({
    where: {
      fechaInicio: { [Op.lte]: hoy },
      fechaFin: { [Op.gte]: hoy }
    }
  });
};

// Método para obtener períodos próximos a vencer (3 días)
Periodo.obtenerPeriodosProximosAVencer = async function(dias = 3) {
  const hoy = new Date();
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);
  
  return await Periodo.findAll({
    where: {
      fechaFin: {
        [Op.between]: [hoy, fechaLimite]
      }
    },
    order: [['fechaFin', 'ASC']]
  });
};

module.exports = Periodo;