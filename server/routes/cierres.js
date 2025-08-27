const express = require('express');
const router = express.Router();
const { Periodo, CierrePeriodo, User } = require('../models');
const { verificaToken } = require('../middlewares/autenticacion');
const { verificaAdmin } = require('../middlewares/autorizacion');
const { verificarPermisosCierre } = require('../middleware/validarPeriodo');
const { Op } = require('sequelize');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificaToken);

// POST - Cerrar período para un usuario
router.post('/cerrar', verificarPermisosCierre, async (req, res) => {
  try {
    const { periodoId, userId, observaciones } = req.body;
    const cerradoPorId = req.usuario.id;

    // Validaciones
    if (!periodoId || !userId) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El período y usuario son requeridos'
      });
    }

    // Verificar que el período existe
    const periodo = await Periodo.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El período no existe'
      });
    }

    // Verificar que el usuario existe
    const usuario = await User.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El usuario no existe'
      });
    }

    // Realizar el cierre
    const cierre = await CierrePeriodo.cerrarPeriodoParaUsuario(
      periodoId,
      userId,
      cerradoPorId,
      observaciones
    );

    // Obtener información completa del cierre
    const cierreCompleto = await CierrePeriodo.findByPk(cierre.id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nombreUsuario', 'nombreCompleto', 'correo']
        },
        {
          model: User,
          as: 'cerradoPor',
          attributes: ['nombreUsuario', 'nombreCompleto']
        },
        {
          model: Periodo,
          as: 'periodo'
        }
      ]
    });

    res.json({
      ok: true,
      mensaje: `Período cerrado exitosamente para ${usuario.nombreCompleto}`,
      cierre: cierreCompleto
    });
  } catch (error) {
    console.error('Error cerrando período:', error);
    res.status(500).json({
      ok: false,
      mensaje: error.message || 'Error al cerrar el período',
      error: error.message
    });
  }
});

// POST - Cerrar período para múltiples usuarios
router.post('/cerrar-multiple', verificarPermisosCierre, async (req, res) => {
  try {
    const { periodoId, userIds, observaciones } = req.body;
    const cerradoPorId = req.usuario.id;

    if (!periodoId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Se requiere período y al menos un usuario'
      });
    }

    // Verificar que el período existe
    const periodo = await Periodo.findByPk(periodoId);
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'El período no existe'
      });
    }

    const resultados = {
      exitosos: [],
      fallidos: []
    };

    // Procesar cada usuario
    for (const userId of userIds) {
      try {
        const cierre = await CierrePeriodo.cerrarPeriodoParaUsuario(
          periodoId,
          userId,
          cerradoPorId,
          observaciones
        );
        
        const usuario = await User.findByPk(userId);
        resultados.exitosos.push({
          userId,
          nombreUsuario: usuario.nombreUsuario,
          cierreId: cierre.id
        });
      } catch (error) {
        const usuario = await User.findByPk(userId);
        resultados.fallidos.push({
          userId,
          nombreUsuario: usuario ? usuario.nombreUsuario : 'Usuario no encontrado',
          error: error.message
        });
      }
    }

    res.json({
      ok: true,
      mensaje: `Proceso completado: ${resultados.exitosos.length} cierres exitosos, ${resultados.fallidos.length} fallos`,
      resultados
    });
  } catch (error) {
    console.error('Error en cierre múltiple:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al procesar los cierres',
      error: error.message
    });
  }
});

// GET - Obtener cierres de un usuario específico
router.get('/usuario/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Si no es admin, solo puede ver sus propios cierres
    if (req.usuario.userTypeId > 2 && req.usuario.id != userId) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tienes permisos para ver estos cierres'
      });
    }

    const cierres = await CierrePeriodo.findAll({
      where: { userId },
      include: [
        {
          model: Periodo,
          as: 'periodo'
        },
        {
          model: User,
          as: 'cerradoPor',
          attributes: ['nombreUsuario', 'nombreCompleto']
        }
      ],
      order: [['fechaCierre', 'DESC']]
    });

    res.json({
      ok: true,
      cierres
    });
  } catch (error) {
    console.error('Error obteniendo cierres del usuario:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los cierres',
      error: error.message
    });
  }
});

// GET - Obtener usuarios con períodos pendientes de cierre
router.get('/pendientes', verificaAdmin, async (req, res) => {
  try {
    const { periodoId } = req.query;

    if (!periodoId) {
      // Si no se especifica período, usar el actual
      const periodoActual = await Periodo.obtenerPeriodoActual();
      
      if (!periodoActual) {
        return res.status(404).json({
          ok: false,
          mensaje: 'No hay un período activo'
        });
      }

      const usuariosPendientes = await CierrePeriodo.obtenerUsuariosSinCerrar(periodoActual.id);
      
      return res.json({
        ok: true,
        periodo: periodoActual,
        usuariosPendientes
      });
    }

    // Si se especifica período
    const periodo = await Periodo.findByPk(periodoId);
    
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Período no encontrado'
      });
    }

    const usuariosPendientes = await CierrePeriodo.obtenerUsuariosSinCerrar(periodoId);

    res.json({
      ok: true,
      periodo,
      usuariosPendientes
    });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los pendientes',
      error: error.message
    });
  }
});

// GET - Dashboard de resumen de cierres
router.get('/dashboard', verificaAdmin, async (req, res) => {
  try {
    // Obtener período actual
    const periodoActual = await Periodo.obtenerPeriodoActual();
    
    let resumenActual = null;
    if (periodoActual) {
      resumenActual = await CierrePeriodo.obtenerResumenPeriodo(periodoActual.id);
    }

    // Obtener períodos próximos a vencer
    const periodosProximos = await Periodo.obtenerPeriodosProximosAVencer(3);
    
    // Para cada período próximo, obtener usuarios pendientes
    const proximosConPendientes = await Promise.all(
      periodosProximos.map(async (periodo) => {
        const usuariosPendientes = await CierrePeriodo.obtenerUsuariosSinCerrar(periodo.id);
        return {
          periodo,
          usuariosPendientes: usuariosPendientes.length,
          usuarios: usuariosPendientes.slice(0, 5) // Solo los primeros 5 para el dashboard
        };
      })
    );

    // Obtener últimos cierres realizados
    const ultimosCierres = await CierrePeriodo.findAll({
      limit: 10,
      order: [['fechaCierre', 'DESC']],
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nombreUsuario', 'nombreCompleto']
        },
        {
          model: User,
          as: 'cerradoPor',
          attributes: ['nombreUsuario']
        },
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['descripcion']
        }
      ]
    });

    res.json({
      ok: true,
      dashboard: {
        periodoActual,
        resumenActual,
        periodosProximos: proximosConPendientes,
        ultimosCierres
      }
    });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el dashboard',
      error: error.message
    });
  }
});

// DELETE - Reabrir período (eliminar cierre)
router.delete('/:cierreId', verificarPermisosCierre, async (req, res) => {
  try {
    const { cierreId } = req.params;

    const cierre = await CierrePeriodo.findByPk(cierreId, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['nombreCompleto']
        },
        {
          model: Periodo,
          as: 'periodo'
        }
      ]
    });

    if (!cierre) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Cierre no encontrado'
      });
    }

    // Guardar información antes de eliminar
    const infoCierre = {
      usuario: cierre.usuario.nombreCompleto,
      periodo: cierre.periodo.descripcion
    };

    await cierre.destroy();

    res.json({
      ok: true,
      mensaje: `Período reabierto para ${infoCierre.usuario}`,
      info: infoCierre
    });
  } catch (error) {
    console.error('Error reabriendo período:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al reabrir el período',
      error: error.message
    });
  }
});

// GET - Verificar si el usuario actual tiene el período cerrado
router.get('/mi-estado/:periodoId', async (req, res) => {
  try {
    const { periodoId } = req.params;
    const userId = req.usuario.id;

    const estaCerrado = await CierrePeriodo.estaCerradoParaUsuario(periodoId, userId);
    
    let cierre = null;
    if (estaCerrado) {
      cierre = await CierrePeriodo.findOne({
        where: { periodoId, userId },
        include: [
          {
            model: User,
            as: 'cerradoPor',
            attributes: ['nombreUsuario', 'nombreCompleto']
          }
        ]
      });
    }

    res.json({
      ok: true,
      estaCerrado,
      cierre
    });
  } catch (error) {
    console.error('Error verificando estado:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al verificar el estado',
      error: error.message
    });
  }
});

module.exports = router;