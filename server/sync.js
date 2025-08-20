require("./config/config");
const db = require("./config/database");
const { User, UserType, Obra } = require("./models");
const crypto = require("crypto");

async function initializeDatabase() {
  try {
    console.log("Conectando a la base de datos...");
    await db.authenticate();
    console.log("Base de datos conectada correctamente");

    console.log("Sincronizando modelos...");
    await db.sync({ alter: true });
    console.log("Modelos sincronizados correctamente");

    // Crear tipos de usuario predefinidos
    console.log("Creando tipos de usuario...");
    
    const userTypes = [
      {
        id: 1,
        nombre: "Super Administrador",
        descripcion: "Control total del sistema\nGestión de todos los usuarios y roles\nAcceso a todas las configuraciones\nVisualización de toda la información histórica\nModificación de Ingresos en periodo Cerrado",
        permisos: {
          "gestion_usuarios": true,
          "gestion_roles": true,
          "configuracion_sistema": true,
          "reportes_completos": true,
          "cierre_periodos": true,
          "modificar_cerrados": true,
          "catalogo_maestros": true,
          "operaciones_diarias": true
        }
      },
      {
        id: 2,
        nombre: "Administrador",
        descripcion: "Gestión de usuarios comunes\nCierre de períodos quincenales\nAcceso a reportes completos\nGestión de catálogos maestros",
        permisos: {
          "gestion_usuarios": true,
          "reportes_completos": true,
          "cierre_periodos": true,
          "catalogo_maestros": true,
          "operaciones_diarias": true
        }
      },
      {
        id: 3,
        nombre: "Usuario Común",
        descripcion: "Registro de operaciones diarias\nAcceso limitado a su información",
        permisos: {
          "operaciones_diarias": true
        }
      }
    ];

    for (const typeData of userTypes) {
      await UserType.findOrCreate({
        where: { id: typeData.id },
        defaults: typeData
      });
    }

    console.log("Tipos de usuario creados correctamente");

    // Crear usuario Super Administrador por defecto si no existe
    const existingSuperAdmin = await User.findOne({
      where: { userTypeId: 1 }
    });

    if (!existingSuperAdmin) {
      const hash = crypto
        .createHash("md5")
        .update("admin123" + "c0ntr0l0bR4")
        .digest("hex");

      await User.create({
        nombreUsuario: "superadmin",
        nombreCompleto: "Super Administrador",
        correo: "admin@controlobra.com",
        telefono: "",
        contrasenaMD5: hash,
        userTypeId: 1,
        activo: true
      });

      console.log("Usuario Super Administrador creado:");
      console.log("Usuario: superadmin");
      console.log("Contraseña: admin123");
      console.log("Correo: admin@controlobra.com");
    }

    console.log("Base de datos inicializada correctamente");
    process.exit(0);
  } catch (err) {
    console.error("Error al sincronizar la base de datos:", err);
    process.exit(1);
  }
}

initializeDatabase();