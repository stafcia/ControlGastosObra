const jwt = require('jsonwebtoken');
const { User, UserType } = require('../models');

// Middleware para verificar autenticación
const requireAuth = async (req, res, next) => {
  try {
    const token = req.body.token || req.query.token || req.cookies.token;
    
    if (!token) {
      return res.redirect('/?error=' + encodeURIComponent('Acceso no autorizado'));
    }

    jwt.verify(token, process.env.SEED, async (err, decoded) => {
      if (err) {
        return res.redirect('/?error=' + encodeURIComponent('Token inválido'));
      }

      // Buscar usuario en base de datos para verificar que aún existe y está activo
      const user = await User.findOne({
        where: { 
          id: decoded.usuario.id,
          activo: true
        },
        include: [{
          model: UserType,
          as: 'userType'
        }]
      });

      if (!user) {
        return res.redirect('/?error=' + encodeURIComponent('Usuario no encontrado o inactivo'));
      }

      req.usuario = user;
      req.usuarioToken = decoded.usuario;
      
      // Añadir variables globales para las vistas
      res.locals.usuario = user;
      res.locals.userType = user.userType;
      
      next();
    });
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.redirect('/?error=' + encodeURIComponent('Error de autenticación'));
  }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario || !req.usuario.userType) {
        return res.status(403).redirect('/inicio?error=' + encodeURIComponent('Acceso denegado: Sin rol asignado'));
      }

      const userRole = req.usuario.userType.nombre;
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).redirect('/inicio?error=' + encodeURIComponent('Acceso denegado: Permisos insuficientes'));
      }

      next();
    } catch (error) {
      console.error('Error en middleware de roles:', error);
      return res.status(500).redirect('/inicio?error=' + encodeURIComponent('Error interno del servidor'));
    }
  };
};

// Middleware para verificar si es Super Administrador
const requireSuperAdmin = requireRole(['Super Administrador']);

// Middleware para verificar si es Administrador o Super Administrador
const requireAdmin = requireRole(['Super Administrador', 'Administrador']);

module.exports = {
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin
};