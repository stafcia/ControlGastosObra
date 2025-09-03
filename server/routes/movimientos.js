const express = require('express');
const router = express.Router();
const { Movimiento, Obra, User, Periodo, CierrePeriodo } = require('../models');
const { verificaToken } = require('../middlewares/autenticacion');
const { verificaAdmin } = require('../middlewares/autorizacion');
const { Op } = require('sequelize');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificaToken);

// GET - Página principal de movimientos
router.get('/', async (req, res) => {
  try {
    // Obtener período actual
    const periodoActual = await Periodo.obtenerPeriodoActual();
    
    // Verificar si está cerrado para el usuario actual
    let periodoCerrado = false;
    if (periodoActual) {
      periodoCerrado = await CierrePeriodo.estaCerradoParaUsuario(
        periodoActual.id, 
        req.usuario.id
      );
    }

    res.render('pages/movimientos/index', {
      title: 'Registro de Movimientos',
      subtitle: 'Control de flujo de efectivo',
      page: 'movimientos',
      seccion: 'movimientos',
      usuario: req.usuario,
      periodoActual,
      periodoCerrado,
      query: req.query
    });
  } catch (error) {
    console.error('Error al cargar página de movimientos:', error);
    res.redirect('/inicio?error=' + encodeURIComponent('Error al cargar movimientos'));
  }
});

// GET - Obtener todos los movimientos con filtros
router.get('/api/listar', async (req, res) => {
  try {
    const { 
      fechaInicio, 
      fechaFin, 
      obraId, 
      tipo, 
      formaPago,
      page = 1, 
      limit = 50 
    } = req.query;

    // Construir condiciones WHERE
    const whereConditions = {
      activo: true
    };

    if (fechaInicio && fechaFin) {
      whereConditions.fecha = {
        [Op.between]: [fechaInicio, fechaFin]
      };
    } else if (fechaInicio) {
      whereConditions.fecha = {
        [Op.gte]: fechaInicio
      };
    } else if (fechaFin) {
      whereConditions.fecha = {
        [Op.lte]: fechaFin
      };
    }

    if (obraId) {
      whereConditions.obraId = obraId;
    }

    if (tipo) {
      whereConditions.tipo = tipo;
    }

    if (formaPago) {
      whereConditions.formaPago = formaPago;
    }


    const offset = (page - 1) * limit;

    const { count, rows: movimientos } = await Movimiento.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nombre', 'clienteNombre']
        },
        {
          model: User,
          as: 'usuario',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'descripcion', 'fechaInicio', 'fechaFin']
        }
      ],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calcular totales
    const totales = await Movimiento.findAll({
      where: whereConditions,
      attributes: [
        'tipo',
        [Movimiento.sequelize.fn('SUM', Movimiento.sequelize.col('monto')), 'total']
      ],
      group: ['tipo'],
      raw: true
    });

    const resumen = {
      ingresos: 0,
      egresos: 0,
      balance: 0
    };

    totales.forEach(item => {
      if (item.tipo === 'Ingreso') {
        resumen.ingresos = parseFloat(item.total) || 0;
      } else if (item.tipo === 'Egreso') {
        resumen.egresos = parseFloat(item.total) || 0;
      }
    });

    resumen.balance = resumen.ingresos - resumen.egresos;

    res.json({
      ok: true,
      movimientos,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      resumen
    });
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener los movimientos',
      error: error.message
    });
  }
});

// GET - Obtener obras activas para dropdown
router.get('/api/obras', async (req, res) => {
  try {
    const obras = await Obra.findAll({
      where: { 
        activa: true 
      },
      attributes: ['id', 'nombre', 'clienteNombre', 'direccion'],
      order: [['nombre', 'ASC']]
    });

    res.json({
      ok: true,
      obras
    });
  } catch (error) {
    console.error('Error obteniendo obras:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener las obras',
      error: error.message
    });
  }
});

// GET - Obtener resumen financiero por período
router.get('/api/resumen/:periodoId?', async (req, res) => {
  try {
    const periodoId = req.params.periodoId || (await Periodo.obtenerPeriodoActual())?.id;
    
    if (!periodoId) {
      return res.status(404).json({
        ok: false,
        mensaje: 'No se encontró un período válido'
      });
    }

    const resumen = await Movimiento.obtenerResumenPorPeriodo(periodoId);
    
    res.json({
      ok: true,
      resumen,
      periodoId
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el resumen',
      error: error.message
    });
  }
});

// GET - Obtener movimiento por ID
router.get('/api/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const movimiento = await Movimiento.findByPk(id, {
      include: [
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nombre', 'clienteNombre']
        }
      ]
    });

    if (!movimiento) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Movimiento no encontrado'
      });
    }

    res.json({
      ok: true,
      movimiento
    });
  } catch (error) {
    console.error('Error obteniendo movimiento:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el movimiento',
      error: error.message
    });
  }
});

// POST - Crear nuevo movimiento
router.post('/crear', async (req, res) => {
  try {
    const {
      fecha,
      obraId,
      tipo,
      formaPago,
      monto,
      concepto
    } = req.body;

    // Verificar que el período esté abierto
    const periodoActual = await Periodo.obtenerPeriodoActual();
    if (!periodoActual) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No hay un período activo para registrar movimientos'
      });
    }

    const periodoCerrado = await CierrePeriodo.estaCerradoParaUsuario(
      periodoActual.id, 
      req.usuario.id
    );

    if (periodoCerrado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El período actual está cerrado para su usuario'
      });
    }

    // Verificar que la obra existe y está activa
    const obra = await Obra.findOne({
      where: { id: obraId, activa: true }
    });

    if (!obra) {
      return res.status(400).json({
        ok: false,
        mensaje: 'La obra seleccionada no existe o no está activa'
      });
    }

    const nuevoMovimiento = await Movimiento.create({
      fecha,
      obraId,
      tipo,
      formaPago,
      monto: parseFloat(monto),
      concepto,
      userId: req.usuario.id,
      periodoId: periodoActual.id
    });

    res.json({
      ok: true,
      mensaje: 'Movimiento creado exitosamente',
      movimiento: nuevoMovimiento
    });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => err.message);
      return res.status(400).json({
        ok: false,
        mensaje: 'Errores de validación',
        errores
      });
    }

    res.status(500).json({
      ok: false,
      mensaje: 'Error al crear el movimiento',
      error: error.message
    });
  }
});

// PUT - Actualizar movimiento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fecha,
      obraId,
      tipo,
      formaPago,
      monto,
      concepto
    } = req.body;

    const movimiento = await Movimiento.findByPk(id);
    if (!movimiento) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Movimiento no encontrado'
      });
    }

    // Verificar que el período del movimiento esté abierto
    const periodoCerrado = await CierrePeriodo.estaCerradoParaUsuario(
      movimiento.periodoId, 
      req.usuario.id
    );

    if (periodoCerrado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede modificar un movimiento en un período cerrado'
      });
    }

    // Verificar permisos (solo el creador o administrador puede editar)
    if (movimiento.userId !== req.usuario.id && 
        req.usuario.userTypeId !== 1 && req.usuario.userTypeId !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para modificar este movimiento'
      });
    }

    // Verificar que la obra existe y está activa
    if (obraId) {
      const obra = await Obra.findOne({
        where: { id: obraId, activa: true }
      });

      if (!obra) {
        return res.status(400).json({
          ok: false,
          mensaje: 'La obra seleccionada no existe o no está activa'
        });
      }
    }

    await movimiento.update({
      fecha: fecha || movimiento.fecha,
      obraId: obraId || movimiento.obraId,
      tipo: tipo || movimiento.tipo,
      formaPago: formaPago || movimiento.formaPago,
      monto: monto ? parseFloat(monto) : movimiento.monto,
      concepto: concepto || movimiento.concepto
    });

    res.json({
      ok: true,
      mensaje: 'Movimiento actualizado exitosamente',
      movimiento
    });
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => err.message);
      return res.status(400).json({
        ok: false,
        mensaje: 'Errores de validación',
        errores
      });
    }

    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar el movimiento',
      error: error.message
    });
  }
});

// DELETE - Eliminar movimiento (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const movimiento = await Movimiento.findByPk(id);
    if (!movimiento) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Movimiento no encontrado'
      });
    }

    // Verificar que el período del movimiento esté abierto
    const periodoCerrado = await CierrePeriodo.estaCerradoParaUsuario(
      movimiento.periodoId, 
      req.usuario.id
    );

    if (periodoCerrado) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede eliminar un movimiento en un período cerrado'
      });
    }

    // Verificar permisos (solo el creador o administrador puede eliminar)
    if (movimiento.userId !== req.usuario.id && 
        req.usuario.userTypeId !== 1 && req.usuario.userTypeId !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para eliminar este movimiento'
      });
    }

    await movimiento.update({ activo: false });

    res.json({
      ok: true,
      mensaje: 'Movimiento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar el movimiento',
      error: error.message
    });
  }
});

module.exports = router;