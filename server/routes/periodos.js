const express = require('express');
const router = express.Router();
const { Periodo, CierrePeriodo, User } = require('../models');
const { verificaToken } = require('../middlewares/autenticacion');
const { verificaAdmin } = require('../middlewares/autorizacion');
const { agregarInfoPeriodo } = require('../middleware/validarPeriodo');
const { Op } = require('sequelize');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificaToken);

// Agregar información del período actual a todas las rutas
router.use(agregarInfoPeriodo);

// GET - Página principal de períodos
router.get('/', verificaAdmin, async (req, res) => {
  try {
    res.render('pages/periodos/index', {
      title: 'Gestión de Períodos',
      titulo: 'Gestión de Períodos',
      usuario: req.usuario,
      seccion: 'periodos',
      page: 'periodos'
    });
  } catch (error) {
    console.error('Error renderizando página de períodos:', error);
    res.status(500).send('Error al cargar la página');
  }
});

// GET - Obtener todos los períodos
router.get('/api/listar', async (req, res) => {
  try {
    const periodos = await Periodo.findAll({
      order: [['año', 'DESC'], ['numero', 'DESC']],
      include: [{
        model: CierrePeriodo,
        as: 'cierres',
        attributes: ['id', 'userId', 'fechaCierre']
      }]
    });

    // Para cada período, agregar información de cierres
    const periodosConInfo = await Promise.all(periodos.map(async (periodo) => {
      const totalUsuarios = await User.count({ where: { activo: true } });
      const usuariosCerrados = periodo.cierres.length;
      
      return {
        ...periodo.toJSON(),
        totalUsuarios,
        usuariosCerrados,
        usuariosPendientes: totalUsuarios - usuariosCerrados,
        porcentajeCierre: totalUsuarios > 0 ? 
          ((usuariosCerrados / totalUsuarios) * 100).toFixed(0) : 0
      };
    }));

    res.json({
      ok: true,
      periodos: periodosConInfo
    });
  } catch (error) {
    console.error('Error obteniendo períodos:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los períodos',
      error: error.message
    });
  }
});

// GET - Obtener período actual
router.get('/api/actual', async (req, res) => {
  try {
    const periodoActual = await Periodo.obtenerPeriodoActual();
    
    if (!periodoActual) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No hay un período activo'
      });
    }

    // Verificar si está cerrado para el usuario actual
    const estaCerrado = await CierrePeriodo.estaCerradoParaUsuario(
      periodoActual.id, 
      req.usuario.id
    );

    res.json({
      ok: true,
      periodo: periodoActual,
      estaCerrado
    });
  } catch (error) {
    console.error('Error obteniendo período actual:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el período actual',
      error: error.message
    });
  }
});

// POST - Generar períodos quincenales del año
router.post('/api/generar', verificaAdmin, async (req, res) => {
  try {
    const { año } = req.body;

    if (!año || año < 2020 || año > 2100) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Año inválido. Debe estar entre 2020 y 2100'
      });
    }

    // Verificar si ya existen períodos para ese año
    const periodosExistentes = await Periodo.count({ where: { año } });
    
    if (periodosExistentes > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `Ya existen períodos para el año ${año}`
      });
    }

    // Generar períodos quincenales
    const periodosGenerados = await Periodo.generarPeriodosAnuales(año);

    res.json({
      ok: true,
      mensaje: `Se generaron ${periodosGenerados.length} períodos para el año ${año}`,
      periodos: periodosGenerados
    });
  } catch (error) {
    console.error('Error generando períodos:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al generar los períodos',
      error: error.message
    });
  }
});

// GET - Obtener estado de cierre de un período específico
router.get('/api/:periodoId/estado-cierres', verificaAdmin, async (req, res) => {
  try {
    const { periodoId } = req.params;

    // Obtener el período
    const periodo = await Periodo.findByPk(periodoId);
    
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Período no encontrado'
      });
    }

    // Obtener usuarios con cierre
    const cierres = await CierrePeriodo.findAll({
      where: { periodoId },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombreUsuario', 'nombreCompleto', 'correo']
        },
        {
          model: User,
          as: 'cerradoPor',
          attributes: ['nombreUsuario', 'nombreCompleto']
        }
      ]
    });

    // Obtener usuarios sin cierre
    const usuariosSinCerrar = await CierrePeriodo.obtenerUsuariosSinCerrar(periodoId);

    res.json({
      ok: true,
      periodo,
      usuariosConCierre: cierres,
      usuariosSinCierre: usuariosSinCerrar
    });
  } catch (error) {
    console.error('Error obteniendo estado de cierres:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el estado de cierres',
      error: error.message
    });
  }
});

// PUT - Activar/Desactivar un período
router.put('/api/:periodoId/activar', verificaAdmin, async (req, res) => {
  try {
    const { periodoId } = req.params;
    const { activo } = req.body;

    const periodo = await Periodo.findByPk(periodoId);
    
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Período no encontrado'
      });
    }

    // Si se va a activar, primero desactivar todos los demás
    if (activo) {
      await Periodo.update({ activo: false }, { where: { activo: true } });
    }

    // Actualizar el período
    periodo.activo = activo;
    await periodo.save();

    res.json({
      ok: true,
      mensaje: activo ? 'Período activado exitosamente' : 'Período desactivado exitosamente',
      periodo
    });
  } catch (error) {
    console.error('Error actualizando período:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el período',
      error: error.message
    });
  }
});

// GET - Obtener períodos próximos a vencer
router.get('/api/proximos-vencer', async (req, res) => {
  try {
    const diasAnticipacion = req.query.dias || 3;
    const periodosProximos = await Periodo.obtenerPeriodosProximosAVencer(diasAnticipacion);

    // Para cada período, obtener usuarios sin cerrar
    const periodosConPendientes = await Promise.all(
      periodosProximos.map(async (periodo) => {
        const usuariosSinCerrar = await CierrePeriodo.obtenerUsuariosSinCerrar(periodo.id);
        return {
          ...periodo.toJSON(),
          usuariosPendientes: usuariosSinCerrar
        };
      })
    );

    res.json({
      ok: true,
      periodos: periodosConPendientes
    });
  } catch (error) {
    console.error('Error obteniendo períodos próximos a vencer:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener períodos próximos a vencer',
      error: error.message
    });
  }
});

// DELETE - Eliminar un período (solo si no tiene cierres)
router.delete('/api/:periodoId', verificaAdmin, async (req, res) => {
  try {
    const { periodoId } = req.params;

    const periodo = await Periodo.findByPk(periodoId);
    
    if (!periodo) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Período no encontrado'
      });
    }

    // Verificar si tiene cierres
    const tieneCierres = await CierrePeriodo.count({ where: { periodoId } });
    
    if (tieneCierres > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede eliminar un período que tiene cierres registrados'
      });
    }

    await periodo.destroy();

    res.json({
      ok: true,
      mensaje: 'Período eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando período:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar el período',
      error: error.message
    });
  }
});

module.exports = router;