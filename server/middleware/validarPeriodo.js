const { CierrePeriodo, Periodo } = require('../models');

// Middleware para verificar si un período está cerrado para un usuario
const verificarPeriodoAbierto = async (req, res, next) => {
  try {
    const { periodoId } = req.body;
    const userId = req.usuario.id; // El usuario está en req.usuario desde el middleware de autenticación

    if (!periodoId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El ID del período es requerido'
      });
    }

    // Verificar si el período existe
    const periodo = await Periodo.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El período no existe'
      });
    }

    // Verificar si el período está cerrado para el usuario
    const estaCerrado = await CierrePeriodo.estaCerradoParaUsuario(periodoId, userId);
    
    if (estaCerrado) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No se pueden realizar operaciones en un período cerrado'
      });
    }

    // Verificar que no sea un período pasado (solo permitir actual o futuro)
    const hoy = new Date();
    const fechaFin = new Date(periodo.fechaFin);
    
    if (fechaFin < hoy) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No se pueden realizar operaciones en períodos pasados'
      });
    }

    // Si todo está bien, continuar
    req.periodo = periodo; // Adjuntar el período al request para uso posterior
    next();
  } catch (error) {
    console.error('Error en validación de período:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al validar el período',
      error: error.message
    });
  }
};

// Middleware para obtener el período actual
const obtenerPeriodoActual = async (req, res, next) => {
  try {
    const periodoActual = await Periodo.obtenerPeriodoActual();
    
    if (!periodoActual) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No hay un período activo configurado'
      });
    }

    req.periodoActual = periodoActual;
    next();
  } catch (error) {
    console.error('Error obteniendo período actual:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el período actual',
      error: error.message
    });
  }
};

// Middleware para verificar permisos de administrador
const verificarPermisosCierre = async (req, res, next) => {
  try {
    const userType = req.usuario.userTypeId;
    
    // Solo Super Admin (1) y Admin (2) pueden cerrar períodos
    if (userType !== 1 && userType !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permisos para cerrar períodos'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar permisos',
      error: error.message
    });
  }
};

// Middleware para agregar información del período al contexto
const agregarInfoPeriodo = async (req, res, next) => {
  try {
    const userId = req.usuario.id;
    
    // Obtener período actual
    const periodoActual = await Periodo.obtenerPeriodoActual();
    
    if (periodoActual) {
      // Verificar si está cerrado para el usuario
      const estaCerrado = await CierrePeriodo.estaCerradoParaUsuario(
        periodoActual.id, 
        userId
      );
      
      // Calcular días restantes
      const hoy = new Date();
      const fechaFin = new Date(periodoActual.fechaFin);
      const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
      
      // Agregar información al request
      req.infoPeriodo = {
        periodo: periodoActual,
        estaCerrado,
        diasRestantes,
        proximoAVencer: diasRestantes <= 3
      };
      
      // También agregarlo a res.locals para que esté disponible en las vistas
      res.locals.infoPeriodo = req.infoPeriodo;
    }
    
    next();
  } catch (error) {
    console.error('Error agregando info de período:', error);
    // No bloquear la petición, solo loggear el error
    next();
  }
};

module.exports = {
  verificarPeriodoAbierto,
  obtenerPeriodoActual,
  verificarPermisosCierre,
  agregarInfoPeriodo
};