const express = require('express');
const router = express.Router();
const { Obra } = require('../models');
const { verificaToken } = require('../middlewares/autenticacion');
const { verificaAdmin } = require('../middlewares/autorizacion');

// GET - Mostrar lista de obras
router.get('/', verificaToken, verificaAdmin, async (req, res) => {
  try {
    const obras = await Obra.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.render('pages/obras/index', {
      title: 'Gestión de Obras',
      subtitle: 'Administrar obras y proyectos',
      page: 'obras',
      seccion: 'obras',
      usuario: req.usuario.correo,
      obras,
      query: req.query
    });
  } catch (error) {
    console.error('Error al obtener obras:', error);
    res.redirect('/obras?error=' + encodeURIComponent('Error al cargar las obras'));
  }
});

// POST - Crear nueva obra
router.post('/crear', verificaToken, verificaAdmin, async (req, res) => {
  try {
    const {
      nombre,
      direccion,
      descripcion,
      clienteNombre,
      clienteCorreo,
      clienteTelefono,
      fechaInicio,
      fechaTerminoEstimado
    } = req.body;

    await Obra.create({
      nombre,
      direccion,
      descripcion,
      clienteNombre,
      clienteCorreo,
      clienteTelefono,
      fechaInicio,
      fechaTerminoEstimado,
      estado: 'activa',
      activa: true
    });

    res.redirect('/obras?success=' + encodeURIComponent('Obra creada exitosamente'));
  } catch (error) {
    console.error('Error al crear obra:', error);
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message).join(', ');
      res.redirect('/obras?error=' + encodeURIComponent('Error de validación: ' + errors));
    } else {
      res.redirect('/obras?error=' + encodeURIComponent('Error al crear la obra'));
    }
  }
});

// POST - Actualizar obra
router.post('/actualizar/:id', verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      direccion,
      descripcion,
      clienteNombre,
      clienteCorreo,
      clienteTelefono,
      estado,
      fechaInicio,
      fechaTerminoEstimado,
      activa
    } = req.body;

    const obra = await Obra.findByPk(id);
    if (!obra) {
      return res.redirect('/obras?error=' + encodeURIComponent('Obra no encontrada'));
    }

    await obra.update({
      nombre,
      direccion,
      descripcion,
      clienteNombre,
      clienteCorreo,
      clienteTelefono,
      estado,
      fechaInicio,
      fechaTerminoEstimado,
      activa: activa === 'on'
    });

    res.redirect('/obras?success=' + encodeURIComponent('Obra actualizada exitosamente'));
  } catch (error) {
    console.error('Error al actualizar obra:', error);
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message).join(', ');
      res.redirect('/obras?error=' + encodeURIComponent('Error de validación: ' + errors));
    } else {
      res.redirect('/obras?error=' + encodeURIComponent('Error al actualizar la obra'));
    }
  }
});

// POST - Cambiar estado de obra
router.post('/cambiar-estado/:id', verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const obra = await Obra.findByPk(id);
    if (!obra) {
      return res.redirect('/obras?error=' + encodeURIComponent('Obra no encontrada'));
    }

    await obra.update({ estado });

    res.redirect('/obras?success=' + encodeURIComponent('Estado de obra actualizado exitosamente'));
  } catch (error) {
    console.error('Error al cambiar estado de obra:', error);
    res.redirect('/obras?error=' + encodeURIComponent('Error al cambiar el estado de la obra'));
  }
});

// POST - Eliminar/Desactivar obra
router.post('/eliminar/:id', verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const obra = await Obra.findByPk(id);
    if (!obra) {
      return res.redirect('/obras?error=' + encodeURIComponent('Obra no encontrada'));
    }

    await obra.update({ activa: false });

    res.redirect('/obras?success=' + encodeURIComponent('Obra desactivada exitosamente'));
  } catch (error) {
    console.error('Error al desactivar obra:', error);
    res.redirect('/obras?error=' + encodeURIComponent('Error al desactivar la obra'));
  }
});

// API Routes
// GET - Obtener obra por ID (para edición)
router.get('/api/:id', verificaToken, async (req, res) => {
  try {
    const { id } = req.params;
    const obra = await Obra.findByPk(id);

    if (!obra) {
      return res.status(404).json({ error: 'Obra no encontrada' });
    }

    res.json(obra);
  } catch (error) {
    console.error('Error al obtener obra:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;