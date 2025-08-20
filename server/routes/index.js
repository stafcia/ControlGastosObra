const express = require("express");
const app = express();

app.use(require("./login"));
app.use(require("./inicio"));
app.use(require("./usuarios"));
app.use("/obras", require("./obras"));

module.exports = app;