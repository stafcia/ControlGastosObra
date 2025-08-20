const { User, UserType } = require("../models");

// Verificar si el usuario es administrador (Admin o Super Admin)
let verificaAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.usuario.id, {
      include: [{
        model: UserType,
        as: 'userType'
      }]
    });

    if (!user || !user.userType) {
      return res.redirect("/?msg=Acceso denegado - Usuario no válido");
    }

    // Solo Admin (2) y Super Admin (1) pueden acceder
    if (user.userType.id === 1 || user.userType.id === 2) {
      req.userRole = user.userType.nombre;
      next();
    } else {
      return res.redirect("/inicio?msg=Acceso denegado - Permisos insuficientes");
    }
  } catch (error) {
    console.error("Error en verificación de autorización:", error);
    return res.redirect("/?msg=Error de autorización");
  }
};

// Verificar si el usuario es Super Administrador
let verificaSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.usuario.id, {
      include: [{
        model: UserType,
        as: 'userType'
      }]
    });

    if (!user || !user.userType) {
      return res.redirect("/?msg=Acceso denegado - Usuario no válido");
    }

    // Solo Super Admin (1) puede acceder
    if (user.userType.id === 1) {
      req.userRole = user.userType.nombre;
      next();
    } else {
      return res.redirect("/inicio?msg=Acceso denegado - Solo Super Administradores");
    }
  } catch (error) {
    console.error("Error en verificación de Super Admin:", error);
    return res.redirect("/?msg=Error de autorización");
  }
};

// Verificar permisos específicos
let verificaPermiso = (permiso) => {
  return async (req, res, next) => {
    try {
      const user = await User.findByPk(req.usuario.id, {
        include: [{
          model: UserType,
          as: 'userType'
        }]
      });

      if (!user || !user.userType) {
        return res.redirect("/?msg=Acceso denegado - Usuario no válido");
      }

      const permisos = user.userType.permisos || {};
      
      if (permisos[permiso] === true || user.userType.id === 1) { // Super Admin siempre tiene acceso
        req.userRole = user.userType.nombre;
        next();
      } else {
        return res.redirect("/inicio?msg=Acceso denegado - Permiso insuficiente");
      }
    } catch (error) {
      console.error("Error en verificación de permiso:", error);
      return res.redirect("/?msg=Error de autorización");
    }
  };
};

module.exports = { 
  verificaAdmin, 
  verificaSuperAdmin, 
  verificaPermiso 
};