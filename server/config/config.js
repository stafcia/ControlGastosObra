require('dotenv').config();

process.env.PORT = process.env.PORT || 3005;

process.env.NODE_ENV = process.env.NODE_ENV || "dev";

process.env.CADUCIDAD_TOKEN = process.env.CADUCIDAD_TOKEN || 60 * 60 * 60 * 24 * 30;

process.env.SEED = process.env.SEED || "este-es-el-seed-desarrollo";

process.env.ServidorEmail = process.env.SERVIDOR_EMAIL || "mail.example.com";
process.env.PuertoEmail = process.env.PUERTO_EMAIL || "587";
process.env.usuarioEmail = process.env.USUARIO_EMAIL || "noreply@example.com";
process.env.contrasenaEmail = process.env.CONTRASENA_EMAIL || "password123";