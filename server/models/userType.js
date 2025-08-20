const Sequelize = require("sequelize");
const db = require("../config/database");

const UserType = db.define("user_type", {
  nombre: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  descripcion: {
    type: Sequelize.TEXT,
  },
  permisos: {
    type: Sequelize.JSON,
    defaultValue: {},
  },
  activo: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
});


module.exports = UserType;