const jwt = require("jsonwebtoken");

let verificaToken = (req, res, next) => {
  let token = req.body.token || req.query.token || req.cookies.token;
  jwt.verify(token, process.env.SEED, (err, decoded) => {
    if (err) {
      res.redirect("/?msg=token no valido");
    } else {
      req.usuario = decoded.usuario;
      next();
    }
  });
};

module.exports = { verificaToken };