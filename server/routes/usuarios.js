const express = require("express");
const router = express.Router();
const db = require("../config/database");
const crypto = require("crypto");
const { Op } = require("sequelize");

const { verificaToken } = require("../middlewares/autenticacion");
const { verificaAdmin } = require("../middlewares/autorizacion");

const { User, UserType } = require("../models");

// Página principal de gestión de usuarios
router.get("/usuarios", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{
        model: UserType,
        as: 'userType'
      }],
      order: [['fechaCreacion', 'DESC']]
    });

    const userTypes = await UserType.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']]
    });

    res.render("pages/usuarios/index", {
      seccion: "usuarios",
      page: "usuarios",
      title: "Gestión de Usuarios",
      subtitle: "Administrar usuarios y sus permisos",
      usuario: req.usuario,
      users: users,
      userTypes: userTypes
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    res.redirect("/inicio?error=Error al cargar usuarios");
  }
});

// Crear nuevo usuario
router.post("/usuarios/crear", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { nombreUsuario, nombreCompleto, correo, telefono, password, userTypeId } = req.body;

    // Validar que no se intente crear un Super Administrador
    if (parseInt(userTypeId) === 1) {
      return res.redirect("/usuarios?error=No se puede crear un usuario con rol de Super Administrador");
    }

    // Verificar si el nombre de usuario ya existe
    const existingUsername = await User.findOne({ where: { nombreUsuario } });
    if (existingUsername) {
      return res.redirect("/usuarios?error=El nombre de usuario ya está registrado");
    }

    // Verificar si el correo ya existe
    const existingUser = await User.findOne({ where: { correo } });
    if (existingUser) {
      return res.redirect("/usuarios?error=El correo ya está registrado");
    }

    // Crear hash de la contraseña
    const hash = crypto
      .createHash("md5")
      .update(password + "c0ntr0l0bR4")
      .digest("hex");

    const newUser = await User.create({
      nombreUsuario,
      nombreCompleto,
      correo,
      telefono,
      contrasenaMD5: hash,
      userTypeId
    });

    res.redirect("/usuarios?success=Usuario creado exitosamente");
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.redirect("/usuarios?error=Error al crear usuario");
  }
});

// Actualizar usuario
router.post("/usuarios/actualizar/:id", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { nombreUsuario, nombreCompleto, correo, telefono, userTypeId, activo } = req.body;
    const userId = req.params.id;

    // Obtener el usuario actual para verificar si es Super Admin
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.redirect("/usuarios?error=Usuario no encontrado");
    }

    // No permitir cambiar el rol de un Super Admin existente
    if (currentUser.userTypeId === 1) {
      return res.redirect("/usuarios?error=No se puede modificar el rol de un Super Administrador");
    }

    // Validar que no se intente asignar rol de Super Administrador
    if (parseInt(userTypeId) === 1) {
      return res.redirect("/usuarios?error=No se puede asignar el rol de Super Administrador");
    }

    // Verificar si el nombre de usuario ya existe para otro usuario
    const existingUsername = await User.findOne({ 
      where: { 
        nombreUsuario,
        id: { [Op.ne]: userId }
      } 
    });
    
    if (existingUsername) {
      return res.redirect("/usuarios?error=El nombre de usuario ya está registrado por otro usuario");
    }

    // Verificar si el correo ya existe para otro usuario
    const existingUser = await User.findOne({ 
      where: { 
        correo,
        id: { [Op.ne]: userId }
      } 
    });
    
    if (existingUser) {
      return res.redirect("/usuarios?error=El correo ya está registrado por otro usuario");
    }

    await User.update({
      nombreUsuario,
      nombreCompleto,
      correo,
      telefono,
      userTypeId,
      activo: activo === 'on'
    }, {
      where: { id: userId }
    });

    res.redirect("/usuarios?success=Usuario actualizado exitosamente");
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.redirect("/usuarios?error=Error al actualizar usuario");
  }
});

// Cambiar contraseña
router.post("/usuarios/cambiar-password/:id", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    const hash = crypto
      .createHash("md5")
      .update(newPassword + "c0ntr0l0bR4")
      .digest("hex");

    await User.update({
      contrasenaMD5: hash
    }, {
      where: { id: userId }
    });

    res.redirect("/usuarios?success=Contraseña actualizada exitosamente");
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.redirect("/usuarios?error=Error al cambiar contraseña");
  }
});

// Eliminar usuario (desactivar)
router.post("/usuarios/eliminar/:id", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    await User.update({
      activo: false
    }, {
      where: { id: userId }
    });

    res.redirect("/usuarios?success=Usuario desactivado exitosamente");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.redirect("/usuarios?error=Error al eliminar usuario");
  }
});

// API para obtener usuario por ID
router.get("/api/usuarios/:id", verificaToken, verificaAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{
        model: UserType,
        as: 'userType'
      }]
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // No enviar la contraseña
    const userData = user.toJSON();
    delete userData.contrasenaMD5;

    res.json(userData);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

module.exports = router;