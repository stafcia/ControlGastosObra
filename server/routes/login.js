const express = require("express");
const router = express.Router();
const db = require("../config/database");
const Sequelize = require("sequelize");
const { Op } = require("sequelize");
var crypto = require("crypto");

const jwt = require("jsonwebtoken");
const { verificaToken } = require("../middlewares/autenticacion");

const { User } = require("../models");

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  User.findOne({
    where: { 
      [Op.or]: [
        { correo: email },
        { nombreUsuario: email }
      ]
    },
    raw: true,
  }).then((user) => {
    if (user) {
      var hash = crypto
        .createHash("md5")
        .update(password + "c0ntr0l0bR4")
        .digest("hex");
      if (hash != user.contrasenaMD5) {
        return res.redirect("/?m=Usuario o contraseña incorrecto");
      }
      delete user.contrasenaMD5;
      let token = jwt.sign(
        {
          usuario: user,
        },
        process.env.SEED,
        { expiresIn: process.env.CADUCIDAD_TOKEN }
      );
      res.cookie("token", token);
      res.redirect("/");
    } else {
      return res.redirect("/?m=Usuario o contraseña incorrecta");
    }
  });
});

router.get("/logout", (req, res) => {
  res.cookie("token", { expires: Date.now() });
  res.redirect("/");
});

module.exports = router;
