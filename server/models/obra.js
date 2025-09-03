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
  // Datos fiscales
  razonSocial: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 255]
    }
  },
  rfc: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 13],
      rfcValido(value) {
        if (value && value.length > 0) {
          const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
          if (!rfcPattern.test(value)) {
            throw new Error('RFC inválido');
          }
        }
      }
    }
  },
  regimenFiscal: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isIn: {
        args: [['601', '603', '605', '606', '607', '608', '609', '610', '611', '612', '614', '615', '616', '620', '621', '622', '623', '624', '625', '626', '628', '629', '630']],
        msg: 'Régimen fiscal inválido'
      }
    }
  },
  codigoPostal: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [0, 5],
      codigoPostalValido(value) {
        if (value && value.length > 0) {
          if (!/^\d{5}$/.test(value)) {
            throw new Error('El código postal debe ser de 5 dígitos');
          }
        }
      }
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

Obra.sync({ alter: true })
  .then(() => {
    console.log('La tabla "obras" ha sido sincronizada correctamente.');
  })
  .catch((error) => {
    console.error('Error al sincronizar la tabla "obras":', error);
  });
