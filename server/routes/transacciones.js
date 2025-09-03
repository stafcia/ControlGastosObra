const express = require('express');
const router = express.Router();
const { TransaccionUsuario, BalanceUsuario, User, Obra, Periodo, CierrePeriodo } = require('../models');
const { verificaToken } = require('../middlewares/autenticacion');
const { Op } = require('sequelize');

// Aplicar middleware de autenticación a todas las rutas
router.use(verificaToken);

// GET - Página principal de transacciones
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

    // Obtener usuarios activos para los dropdowns
    const usuarios = await User.findAll({
      where: { 
        activo: true,
        id: { [Op.ne]: req.usuario.id } // Excluir al usuario actual
      },
      attributes: ['id', 'nombreCompleto', 'nombreUsuario'],
      order: [['nombreCompleto', 'ASC']]
    });

    // Obtener obras activas
    const obras = await Obra.findAll({
      where: { activa: true },
      attributes: ['id', 'nombre', 'clienteNombre'],
      order: [['nombre', 'ASC']]
    });

    res.render('pages/transacciones/index', {
      title: 'Transacciones entre Usuarios',
      subtitle: 'Control de flujo de efectivo',
      page: 'transacciones',
      seccion: 'transacciones',
      usuario: req.usuario,
      periodoActual,
      periodoCerrado,
      usuarios,
      obras,
      query: req.query
    });
  } catch (error) {
    console.error('Error al cargar página de transacciones:', error);
    res.redirect('/inicio?error=' + encodeURIComponent('Error al cargar transacciones'));
  }
});

// GET - Obtener todas las transacciones con filtros
router.get('/api/listar', async (req, res) => {
  try {
    const { 
      fechaInicio, 
      fechaFin, 
      usuarioOrigenId,
      usuarioDestinoId, 
      tipoMovimiento,
      estado,
      page = 1, 
      limit = 50 
    } = req.query;

    // Construir condiciones WHERE
    const whereConditions = {
      activo: true,
      [Op.or]: [
        { usuarioOrigenId: req.usuario.id },
        { usuarioDestinoId: req.usuario.id },
        { creadoPorId: req.usuario.id }
      ]
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

    if (usuarioOrigenId) {
      whereConditions.usuarioOrigenId = usuarioOrigenId;
    }

    if (usuarioDestinoId) {
      whereConditions.usuarioDestinoId = usuarioDestinoId;
    }

    if (tipoMovimiento) {
      whereConditions.tipoMovimiento = tipoMovimiento;
    }

    if (estado) {
      if (estado === 'Pendiente') {
        whereConditions[Op.or] = [
          { estadoOrigen: 'Pendiente' },
          { estadoDestino: 'Pendiente' }
        ];
      } else if (estado === 'Confirmado') {
        whereConditions.estadoOrigen = 'Confirmado';
        whereConditions.estadoDestino = 'Confirmado';
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: transacciones } = await TransaccionUsuario.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'usuarioOrigen',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: User,
          as: 'usuarioDestino',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: User,
          as: 'creadoPor',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nombre', 'clienteNombre']
        },
        {
          model: Periodo,
          as: 'periodo',
          attributes: ['id', 'descripcion']
        }
      ],
      order: [['fecha', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      ok: true,
      transacciones,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener las transacciones',
      error: error.message
    });
  }
});

// GET - Obtener balance del usuario
router.get('/api/balance/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.usuario.id;
    
    // Verificar permisos - solo puede ver su propio balance o si es admin
    if (userId != req.usuario.id && req.usuario.userTypeId !== 1 && req.usuario.userTypeId !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para ver este balance'
      });
    }

    const periodoActual = await Periodo.obtenerPeriodoActual();
    if (!periodoActual) {
      return res.json({
        ok: true,
        balance: { ingresos: 0, egresos: 0, gastos: 0, balance: 0 },
        periodo: null
      });
    }

    const balance = await TransaccionUsuario.obtenerBalanceUsuario(userId, periodoActual.id);
    
    res.json({
      ok: true,
      balance,
      periodo: periodoActual
    });
  } catch (error) {
    console.error('Error obteniendo balance:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener el balance',
      error: error.message
    });
  }
});

// GET - Obtener transacciones pendientes
router.get('/api/pendientes', async (req, res) => {
  try {
    const pendientes = await TransaccionUsuario.obtenerPendientesPorUsuario(req.usuario.id);
    
    res.json({
      ok: true,
      pendientes
    });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener transacciones pendientes',
      error: error.message
    });
  }
});

// GET - Obtener transacción por ID
router.get('/api/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaccion = await TransaccionUsuario.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuarioOrigen',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: User,
          as: 'usuarioDestino',
          attributes: ['id', 'nombreCompleto', 'nombreUsuario']
        },
        {
          model: Obra,
          as: 'obra',
          attributes: ['id', 'nombre', 'clienteNombre']
        }
      ]
    });

    if (!transaccion) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Transacción no encontrada'
      });
    }

    // Verificar permisos
    if (transaccion.usuarioOrigenId !== req.usuario.id && 
        transaccion.usuarioDestinoId !== req.usuario.id &&
        transaccion.creadoPorId !== req.usuario.id &&
        req.usuario.userTypeId !== 1 && req.usuario.userTypeId !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para ver esta transacción'
      });
    }

    res.json({
      ok: true,
      transaccion
    });
  } catch (error) {
    console.error('Error obteniendo transacción:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener la transacción',
      error: error.message
    });
  }
});

// POST - Crear nueva transacción
router.post('/crear', async (req, res) => {
  try {
    const {
      fecha,
      usuarioOrigenId,
      usuarioDestinoId,
      tipoMovimiento,
      tipoGasto,
      obraId,
      proveedorNombre,
      concepto,
      formaPago,
      monto,
      observaciones
    } = req.body;

    // Verificar que el período esté abierto
    const periodoActual = await Periodo.obtenerPeriodoActual();
    if (!periodoActual) {
      return res.status(400).json({
        ok: false,
        mensaje: 'No hay un período activo para registrar transacciones'
      });
    }

    // Validar fecha dentro del período
    const fechaTransaccion = new Date(fecha);
    const fechaInicio = new Date(periodoActual.fechaInicio);
    const fechaFin = new Date(periodoActual.fechaFin);
    
    if (fechaTransaccion < fechaInicio || fechaTransaccion > fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: `La fecha debe estar entre ${periodoActual.fechaInicio} y ${periodoActual.fechaFin}`
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

    // Validar que uno de los usuarios sea el usuario actual
    if (usuarioOrigenId != req.usuario.id && usuarioDestinoId != req.usuario.id) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Debe participar en la transacción como origen o destino'
      });
    }

    // Crear la transacción principal
    const nuevaTransaccion = await TransaccionUsuario.create({
      fecha,
      usuarioOrigenId,
      usuarioDestinoId,
      tipoMovimiento,
      tipoGasto,
      obraId: obraId || null,
      proveedorNombre,
      concepto,
      formaPago,
      monto: parseFloat(monto),
      observaciones,
      creadoPorId: req.usuario.id,
      periodoId: periodoActual.id,
      // Si el usuario actual es el origen, marca como confirmado automáticamente
      estadoOrigen: usuarioOrigenId == req.usuario.id ? 'Confirmado' : 'Pendiente',
      estadoDestino: usuarioDestinoId == req.usuario.id ? 'Confirmado' : 'Pendiente',
      fechaConfirmacionOrigen: usuarioOrigenId == req.usuario.id ? new Date() : null,
      fechaConfirmacionDestino: usuarioDestinoId == req.usuario.id ? new Date() : null
    });

    // Emit socket event to notify the other user about the new transaction
    const io = req.app.get('io');
    const otroUsuarioId = usuarioOrigenId == req.usuario.id ? usuarioDestinoId : usuarioOrigenId;
    
    // Notify the other user about the new transaction that needs confirmation
    io.to(`user-${otroUsuarioId}`).emit('new-transaction', {
      transactionId: nuevaTransaccion.id,
      from: req.usuario.nombreCompleto,
      amount: parseFloat(monto),
      type: tipoMovimiento,
      message: `Nueva transacción pendiente de confirmación de ${req.usuario.nombreCompleto}`
    });

    res.json({
      ok: true,
      mensaje: 'Transacción creada exitosamente',
      transaccion: nuevaTransaccion
    });
  } catch (error) {
    console.error('Error al crear transacción:', error);
    
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
      mensaje: 'Error al crear la transacción',
      error: error.message
    });
  }
});

// PUT - Confirmar/rechazar transacción
router.put('/confirmar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { accion } = req.body; // 'confirmar' o 'rechazar'

    const transaccion = await TransaccionUsuario.findByPk(id);
    if (!transaccion) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Transacción no encontrada'
      });
    }

    // Verificar que el usuario puede confirmar/rechazar
    const esOrigen = transaccion.usuarioOrigenId == req.usuario.id;
    const esDestino = transaccion.usuarioDestinoId == req.usuario.id;
    
    if (!esOrigen && !esDestino) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para confirmar esta transacción'
      });
    }

    // Verificar que no esté ya confirmada/rechazada
    if ((esOrigen && transaccion.estadoOrigen !== 'Pendiente') ||
        (esDestino && transaccion.estadoDestino !== 'Pendiente')) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Esta transacción ya fue procesada'
      });
    }

    const nuevoEstado = accion === 'confirmar' ? 'Confirmado' : 'Rechazado';
    const ahora = new Date();

    const updateData = {};
    
    if (esOrigen) {
      updateData.estadoOrigen = nuevoEstado;
      updateData.fechaConfirmacionOrigen = ahora;
    }
    
    if (esDestino) {
      updateData.estadoDestino = nuevoEstado;
      updateData.fechaConfirmacionDestino = ahora;
    }

    await transaccion.update(updateData);
    
    // Recargar la transacción para obtener los datos actualizados
    await transaccion.reload();

    // Si ambos confirmaron, actualizar balance
    if (transaccion.estadoOrigen === 'Confirmado' && 
        transaccion.estadoDestino === 'Confirmado') {
      await BalanceUsuario.actualizarBalance(transaccion.usuarioOrigenId, transaccion.periodoId);
      await BalanceUsuario.actualizarBalance(transaccion.usuarioDestinoId, transaccion.periodoId);
    }

    // Emit socket event to notify the other user about the transaction update
    const io = req.app.get('io');
    const otroUsuarioId = esOrigen ? transaccion.usuarioDestinoId : transaccion.usuarioOrigenId;
    
    // Notify the other user about the transaction update
    io.to(`user-${otroUsuarioId}`).emit('transaction-updated', {
      transactionId: id,
      action: accion,
      updatedBy: req.usuario.id,
      status: nuevoEstado
    });
    
    // Also notify the current user to update their own view
    io.to(`user-${req.usuario.id}`).emit('transaction-updated', {
      transactionId: id,
      action: accion,
      updatedBy: req.usuario.id,
      status: nuevoEstado
    });

    res.json({
      ok: true,
      mensaje: `Transacción ${accion === 'confirmar' ? 'confirmada' : 'rechazada'} exitosamente`
    });
  } catch (error) {
    console.error('Error al confirmar transacción:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al procesar la transacción',
      error: error.message
    });
  }
});

// DELETE - Eliminar transacción (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const transaccion = await TransaccionUsuario.findByPk(id);
    if (!transaccion) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Transacción no encontrada'
      });
    }

    // Solo el creador o admin puede eliminar
    if (transaccion.creadoPorId !== req.usuario.id && 
        req.usuario.userTypeId !== 1 && req.usuario.userTypeId !== 2) {
      return res.status(403).json({
        ok: false,
        mensaje: 'No tiene permisos para eliminar esta transacción'
      });
    }

    // No permitir eliminar si ya está confirmada por ambas partes
    if (transaccion.estadoOrigen === 'Confirmado' && transaccion.estadoDestino === 'Confirmado') {
      return res.status(400).json({
        ok: false,
        mensaje: 'No se puede eliminar una transacción confirmada por ambas partes'
      });
    }

    await transaccion.update({ activo: false });

    res.json({
      ok: true,
      mensaje: 'Transacción eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar transacción:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar la transacción',
      error: error.message
    });
  }
});

module.exports = router;