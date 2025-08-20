document.addEventListener("DOMContentLoaded", function () {
  // Limpiar URL después de mostrar mensajes
  if (window.location.search.includes('success=') || window.location.search.includes('error=')) {
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // Función global para cerrar mensajes
  window.cerrarMensaje = function(messageId) {
    const message = document.getElementById(messageId);
    if (message) {
      message.style.display = 'none';
    }
  };

  // Auto cerrar mensajes después de 5 segundos
  setTimeout(() => {
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    if (errorMessage) errorMessage.style.display = 'none';
    if (successMessage) successMessage.style.display = 'none';
  }, 5000);

  // Inicializar DataTable
  if (typeof $ !== 'undefined' && $.fn.DataTable) {
    $('#usuariosTable').DataTable({
      responsive: true,
      language: {
        "decimal": "",
        "emptyTable": "No hay datos disponibles en la tabla",
        "info": "Mostrando _START_ a _END_ de _TOTAL_ entradas",
        "infoEmpty": "Mostrando 0 a 0 de 0 entradas",
        "infoFiltered": "(filtrado de _MAX_ entradas totales)",
        "infoPostFix": "",
        "thousands": ",",
        "lengthMenu": "Mostrar _MENU_ entradas",
        "loadingRecords": "Cargando...",
        "processing": "Procesando...",
        "search": "Buscar:",
        "zeroRecords": "No se encontraron registros coincidentes",
        "paginate": {
          "first": "Primero",
          "last": "Último",
          "next": "Siguiente",
          "previous": "Anterior"
        },
        "aria": {
          "sortAscending": ": activar para ordenar la columna ascendente",
          "sortDescending": ": activar para ordenar la columna descendente"
        }
      },
      pageLength: 10,
      order: [[0, 'asc']],
      columnDefs: [
        {
          targets: [5], // Columna de acciones (Funciones)
          orderable: false,
          searchable: false
        }
      ]
    });
  }

  // Elementos del DOM
  const modalUsuario = document.getElementById("modalUsuario");
  const modalPassword = document.getElementById("modalPassword");
  const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
  const btnCerrarModal = document.getElementById("btnCerrarModal");
  const btnCancelar = document.getElementById("btnCancelar");
  const btnCerrarModalPassword = document.getElementById("btnCerrarModalPassword");
  const btnCancelarPassword = document.getElementById("btnCancelarPassword");
  
  const usuarioForm = document.getElementById("usuarioForm");
  const passwordForm = document.getElementById("passwordForm");
  const modalOverlay = document.getElementById("modalOverlay");

  // Abrir modal para nuevo usuario
  btnNuevoUsuario.addEventListener("click", function () {
    resetearFormulario();
    document.getElementById("modalTitle").textContent = "Nuevo Usuario";
    usuarioForm.action = "/usuarios/crear";
    document.getElementById("activoGroup").style.display = "none";
    document.getElementById("password").required = true;
    modalUsuario.classList.remove("t-hidden");
    document.body.classList.add("t-overflow-hidden");
  });

  // Cerrar modales
  function cerrarModal() {
    modalUsuario.classList.add("t-hidden");
    modalPassword.classList.add("t-hidden");
    document.body.classList.remove("t-overflow-hidden");
  }

  btnCerrarModal.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);
  btnCerrarModalPassword.addEventListener("click", cerrarModal);
  btnCancelarPassword.addEventListener("click", cerrarModal);
  modalOverlay.addEventListener("click", cerrarModal);

  // Función para resetear el formulario
  function resetearFormulario() {
    usuarioForm.reset();
    document.getElementById("usuarioId").value = "";
    document.getElementById("password").required = true;
  }

  // Función global para editar usuario
  window.editarUsuario = async function(userId) {
    try {
      const response = await fetch(`/api/usuarios/${userId}`);
      const user = await response.json();

      if (response.ok) {
        document.getElementById("usuarioId").value = user.id;
        document.getElementById("nombreUsuario").value = user.nombreUsuario;
        document.getElementById("nombreCompleto").value = user.nombreCompleto;
        document.getElementById("correo").value = user.correo;
        document.getElementById("telefono").value = user.telefono || "";
        document.getElementById("userTypeId").value = user.userTypeId;
        document.getElementById("activo").checked = user.activo;

        document.getElementById("modalTitle").textContent = "Editar Usuario";
        usuarioForm.action = `/usuarios/actualizar/${userId}`;
        document.getElementById("activoGroup").style.display = "block";
        document.getElementById("password").required = false;
        document.getElementById("password").placeholder = "Dejar en blanco para no cambiar";

        modalUsuario.classList.remove("t-hidden");
        document.body.classList.add("t-overflow-hidden");
      } else {
        alert("Error al cargar datos del usuario");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar datos del usuario");
    }
  };

  // Función global para cambiar contraseña
  window.cambiarPassword = function(userId) {
    document.getElementById("passwordUserId").value = userId;
    passwordForm.action = `/usuarios/cambiar-password/${userId}`;
    modalPassword.classList.remove("t-hidden");
    document.body.classList.add("t-overflow-hidden");
  };

  // Función global para eliminar usuario
  window.eliminarUsuario = function(userId) {
    if (confirm("¿Está seguro de que desea desactivar este usuario?")) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/usuarios/eliminar/${userId}`;
      document.body.appendChild(form);
      form.submit();
    }
  };

  // Validación del formulario
  usuarioForm.addEventListener("submit", function(e) {
    const nombreUsuario = document.getElementById("nombreUsuario").value.trim();
    const nombreCompleto = document.getElementById("nombreCompleto").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const userTypeId = document.getElementById("userTypeId").value;
    const password = document.getElementById("password").value;
    const isEditing = document.getElementById("usuarioId").value !== "";

    if (!nombreUsuario || !nombreCompleto || !correo || !userTypeId) {
      e.preventDefault();
      alert("Por favor, complete todos los campos requeridos");
      return;
    }

    if (!isEditing && !password) {
      e.preventDefault();
      alert("La contraseña es requerida para nuevos usuarios");
      return;
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      e.preventDefault();
      alert("Por favor, ingrese un correo electrónico válido");
      return;
    }
  });

  // Validación del formulario de contraseña
  passwordForm.addEventListener("submit", function(e) {
    const newPassword = document.getElementById("newPassword").value;

    if (!newPassword || newPassword.length < 6) {
      e.preventDefault();
      alert("La contraseña debe tener al menos 6 caracteres");
      return;
    }
  });
});