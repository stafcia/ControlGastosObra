require("./config/config");
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const Sequelize = require("sequelize");
const http = require("http");
const path = require("path");
const jwt = require("jsonwebtoken");
const process = require("node:process");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
let server = http.createServer(app);
const publicPath = path.resolve(__dirname, "../public");
app.set("view engine", "ejs");
app.use(express.static(publicPath));

app.use(require("./routes/index"));

process.on("unhandledRejection", (error, promise) => {
  console.log("\x1b[41m Error de Ejecucion: \x1b[0m", JSON.stringify(promise));
  console.log("\x1b[41m El error fue: \x1b[0m", error);
});

app.get("/logout", (req, res) => {
  res.cookie("token", { expires: Date.now() });
  res.redirect("/");
});

app.get("/", (req, res) => {
  let token = req.body.token || req.query.token || req.cookies.token;
  if (token) {
    jwt.verify(token, process.env.SEED, (err, decoded) => {
      if (err) {
        res.render("pages/login/index", {
          seccion: "login",
          page: "login",
          title: "Iniciar Sesión",
          subtitle: "",
        });
      } else {
        req.usuario = decoded.usuario;
        if (decoded.usuario) {
          res.redirect("/inicio");
        } else {
          res.render("pages/login/index", {
            seccion: "login",
            page: "login",
            title: "Iniciar Sesión",
            subtitle: "",
          });
        }
      }
    });
  } else {
    res.render("pages/login/index", {
      seccion: "login",
      page: "login",
      title: "Iniciar Sesión",
      subtitle: "",
    });
  }
});

server.listen(process.env.PORT, (err) => {
  if (err) throw new Error(err);
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});