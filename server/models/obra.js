const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Obra = sequelize.define('Obra', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  clienteNombre: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 255]
    }
  },
  clienteCorreo: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      isEmail: true
    }
  },
  clienteTelefono: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 20]
    }
  },
  estado: {
    type: DataTypes.ENUM('activa', 'pausada', 'terminada'),
    allowNull: false,
    defaultValue: 'activa'
  },
  fechaInicio: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true
    }
  },
  fechaTerminoEstimado: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      notEmpty: true,
      isDate: true,
      isAfterStartDate(value) {
        if (this.fechaInicio && value <= this.fechaInicio) {
          throw new Error('La fecha de término debe ser posterior a la fecha de inicio');
        }
      }
    }
  },
  fechaTerminoReal: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true
    }
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'obras',
  timestamps: true,
  hooks: {
    beforeUpdate: (obra) => {
      if (obra.estado === 'terminada' && !obra.fechaTerminoReal) {
        obra.fechaTerminoReal = new Date();
      }
    }
  }
});

module.exports = Obra;