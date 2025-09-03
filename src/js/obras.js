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
    $('#obrasTable').DataTable({
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
  const modalObra = document.getElementById("modalObra");
  const modalEstado = document.getElementById("modalEstado");
  const btnNuevaObra = document.getElementById("btnNuevaObra");
  const btnCerrarModal = document.getElementById("btnCerrarModal");
  const btnCancelar = document.getElementById("btnCancelar");
  const btnCerrarModalEstado = document.getElementById("btnCerrarModalEstado");
  const btnCancelarEstado = document.getElementById("btnCancelarEstado");
  const obraForm = document.getElementById("obraForm");
  const estadoForm = document.getElementById("estadoForm");
  const modalOverlay = document.getElementById("modalOverlay");

  // Abrir modal para nueva obra
  btnNuevaObra.addEventListener("click", function () {
    resetearFormulario();
    document.getElementById("modalTitle").textContent = "Nueva Obra";
    obraForm.action = "/obras/crear";
    document.getElementById("activaGroup").style.display = "none";
    document.getElementById("estado").value = "activa";
    modalObra.classList.remove("t-hidden");
    document.body.classList.add("t-overflow-hidden");
  });

  // Cerrar modales
  function cerrarModal() {
    modalObra.classList.add("t-hidden");
    modalEstado.classList.add("t-hidden");
    document.body.classList.remove("t-overflow-hidden");
  }
  
  btnCerrarModal.addEventListener("click", cerrarModal);
  btnCancelar.addEventListener("click", cerrarModal);
  btnCerrarModalEstado.addEventListener("click", cerrarModal);
  btnCancelarEstado.addEventListener("click", cerrarModal);
  modalOverlay.addEventListener("click", cerrarModal);

  // Función para resetear el formulario
  function resetearFormulario() {
    obraForm.reset();
    document.getElementById("obraId").value = "";
    
    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("fechaInicio").min = today;
    document.getElementById("fechaTerminoEstimado").min = today;
  }

  // Función global para editar obra
  window.editarObra = async function (obraId) {
    try {
      const response = await fetch(`/obras/api/${obraId}`);
      const obra = await response.json();
      
      if (response.ok) {
        document.getElementById("obraId").value = obra.id;
        document.getElementById("nombre").value = obra.nombre;
        document.getElementById("direccion").value = obra.direccion;
        document.getElementById("descripcion").value = obra.descripcion || "";
        document.getElementById("clienteNombre").value = obra.clienteNombre;
        document.getElementById("clienteCorreo").value = obra.clienteCorreo;
        document.getElementById("clienteTelefono").value = obra.clienteTelefono || "";
        document.getElementById("razonSocial").value = obra.razonSocial || "";
        document.getElementById("rfc").value = obra.rfc || "";
        document.getElementById("regimenFiscal").value = obra.regimenFiscal || "";
        document.getElementById("codigoPostal").value = obra.codigoPostal || "";
        document.getElementById("estado").value = obra.estado;
        document.getElementById("activa").checked = obra.activa;
        
        // Formatear fechas para input date
        document.getElementById("fechaInicio").value = new Date(obra.fechaInicio).toISOString().split('T')[0];
        document.getElementById("fechaTerminoEstimado").value = new Date(obra.fechaTerminoEstimado).toISOString().split('T')[0];
        
        document.getElementById("modalTitle").textContent = "Editar Obra";
        obraForm.action = `/obras/actualizar/${obraId}`;
        document.getElementById("activaGroup").style.display = "block";
        modalObra.classList.remove("t-hidden");
        document.body.classList.add("t-overflow-hidden");
      } else {
        alert("Error al cargar datos de la obra");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al cargar datos de la obra");
    }
  };

  // Función global para cambiar estado de obra
  window.cambiarEstadoObra = function (obraId) {
    document.getElementById("estadoObraId").value = obraId;
    estadoForm.action = `/obras/cambiar-estado/${obraId}`;
    modalEstado.classList.remove("t-hidden");
    document.body.classList.add("t-overflow-hidden");
  };

  // Función global para eliminar obra
  window.eliminarObra = function (obraId) {
    if (confirm("¿Está seguro de que desea desactivar esta obra?")) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/obras/eliminar/${obraId}`;
      document.body.appendChild(form);
      form.submit();
    }
  };

  // Validación del formulario
  obraForm.addEventListener("submit", function (e) {
    const nombre = document.getElementById("nombre").value.trim();
    const direccion = document.getElementById("direccion").value.trim();
    const clienteNombre = document.getElementById("clienteNombre").value.trim();
    const clienteCorreo = document.getElementById("clienteCorreo").value.trim();
    const fechaInicio = document.getElementById("fechaInicio").value;
    const fechaTerminoEstimado = document.getElementById("fechaTerminoEstimado").value;

    if (!nombre || !direccion || !clienteNombre || !clienteCorreo || !fechaInicio || !fechaTerminoEstimado) {
      e.preventDefault();
      alert("Por favor, complete todos los campos requeridos");
      return;
    }

    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clienteCorreo)) {
      e.preventDefault();
      alert("Por favor, ingrese un correo electrónico válido");
      return;
    }

    // Validar que la fecha de término sea posterior a la de inicio
    if (new Date(fechaTerminoEstimado) <= new Date(fechaInicio)) {
      e.preventDefault();
      alert("La fecha de término debe ser posterior a la fecha de inicio");
      return;
    }
  });

  // Validación del formulario de estado
  estadoForm.addEventListener("submit", function (e) {
    const nuevoEstado = document.getElementById("nuevoEstado").value;
    if (!nuevoEstado) {
      e.preventDefault();
      alert("Por favor, seleccione un estado");
      return;
    }
  });

  // Actualizar fecha mínima de término cuando cambie la fecha de inicio
  document.getElementById("fechaInicio").addEventListener("change", function () {
    const fechaInicio = this.value;
    if (fechaInicio) {
      document.getElementById("fechaTerminoEstimado").min = fechaInicio;
    }
  });
});