const Sequelize = require("sequelize");
const db = require("../config/database");

const User = db.define("user", {
  nombreUsuario: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  nombreCompleto: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  correo: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  telefono: {
    type: Sequelize.STRING,
  },
  contrasenaMD5: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  userTypeId: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 3, // Usuario Común por defecto
  },
  activo: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  fechaCreacion: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  },
});

User.toJSON = function () {
  let User = this;
  let UserObject = User.toObject();
  return UserObject;
};


module.exports = User;