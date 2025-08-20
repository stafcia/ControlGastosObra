require("../config/config");
const express = require("express");
const router = express();
const Sequelize = require("sequelize");
const db = require("../config/database");

const { verificaToken } = require("../middlewares/autenticacion");

router.get("/inicio", verificaToken, (req, res) => {
  res.render("pages/inicio", {
    seccion: "inicio",
    page: "inicio",
    title: "Inicio Aplicacion",
    subtitle: "",
    usuario: req.usuario.correo,
  });
});

module.exports = router;