const express = require("express");
const app = express();

app.use(require("./login"));
app.use(require("./inicio"));
app.use(require("./usuarios"));
app.use("/obras", require("./obras"));
app.use("/periodos", require("./periodos"));
app.use("/cierres", require("./cierres"));

module.exports = app;