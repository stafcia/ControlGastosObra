let tablaTransacciones;
let transaccionesData = [];
let balanceData = {};
let pendientesData = [];
let transaccionActualId = null;
let periodoActual = null;
let filtrosActivos = {
  fechaInicio: '',
  fechaFin: '',
  tipoMovimiento: '',
  estado: ''
};

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(() => {
    inicializarTabla();
    cargarDatosPrincipales();
    inicializarEventos();
  }, 100);
});

function inicializarTabla() {
  tablaTransacciones = $('#tablaTransacciones').DataTable({
    language: {
      "sProcessing": "Procesando...",
      "sLengthMenu": "Mostrar _MENU_ registros",
      "sZeroRecords": "No se encontraron transacciones",
      "sEmptyTable": "No hay transacciones registradas",
      "sInfo": "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
      "sInfoEmpty": "Mostrando registros del 0 al 0 de un total de 0 registros",
      "sInfoFiltered": "(filtrado de un total de _MAX_ registros)",
      "sSearch": "Buscar:",
      "oPaginate": {
        "sFirst": "Primero",
        "sLast": "Último",
        "sNext": "Siguiente",
        "sPrevious": "Anterior"
      }
    },
    order: [[0, 'desc']], // Ordenar por fecha descendente
    columnDefs: [
      {
        orderable: false,
        targets: 6 // Columna de acciones
      },
      {
        className: 'text-right',
        targets: 4 // Columna de monto
      }
    ],
    pageLength: 25,
    responsive: true
  });
}

function inicializarEventos() {
  // Modal events
  document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
  document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
  document.getElementById('modalOverlay').addEventListener('click', cerrarModal);
  
  // Modal confirmar events
  document.getElementById('btnCerrarModalConfirmar').addEventListener('click', cerrarModalConfirmar);
  document.getElementById('btnConfirmar').addEventListener('click', () => confirmarTransaccion('confirmar'));
  document.getElementById('btnRechazar').addEventListener('click', () => confirmarTransaccion('rechazar'));
  
  // Form submit
  document.getElementById('transaccionForm').addEventListener('submit', guardarTransaccion);
  
  // Filtros
  document.getElementById('fechaInicio').addEventListener('change', () => {
    filtrosActivos.fechaInicio = document.getElementById('fechaInicio').value;
  });
  
  document.getElementById('fechaFin').addEventListener('change', () => {
    filtrosActivos.fechaFin = document.getElementById('fechaFin').value;
  });
  
  document.getElementById('filtroTipo').addEventListener('change', () => {
    filtrosActivos.tipoMovimiento = document.getElementById('filtroTipo').value;
  });
  
  document.getElementById('filtroEstado').addEventListener('change', () => {
    filtrosActivos.estado = document.getElementById('filtroEstado').value;
  });
}

async function cargarDatosPrincipales() {
  try {
    await Promise.all([
      cargarBalance(),
      cargarPendientes(),
      cargarTransacciones()
    ]);
  } catch (error) {
    console.error('Error cargando datos principales:', error);
    mostrarAlerta('Error de conexión al cargar datos', 'danger');
  }
}

async function cargarBalance() {
  try {
    const response = await fetch('/transacciones/api/balance');
    const data = await response.json();
    
    if (data.ok) {
      balanceData = data.balance;
      periodoActual = data.periodo;
      actualizarBalance();
    }
  } catch (error) {
    console.error('Error cargando balance:', error);
  }
}

function actualizarBalance() {
  const contenedor = document.getElementById('balancePersonal');
  
  const ingresos = parseFloat(balanceData.ingresos) || 0;
  const egresos = parseFloat(balanceData.egresos) || 0;
  const gastos = parseFloat(balanceData.gastos) || 0;
  const balance = parseFloat(balanceData.balance) || 0;
  
  const balanceClass = balance >= 0 ? 't-text-green-600' : 't-text-red-600';
  
  contenedor.innerHTML = `
    <div class="t-text-center">
      <div class="t-text-2xl t-font-bold t-text-green-600">$${ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
      <div class="t-text-xs t-text-gray-500">Ingresos</div>
    </div>
    <div class="t-text-center">
      <div class="t-text-2xl t-font-bold t-text-red-600">$${egresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
      <div class="t-text-xs t-text-gray-500">Egresos</div>
    </div>
    <div class="t-text-center">
      <div class="t-text-2xl t-font-bold t-text-orange-600">$${gastos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
      <div class="t-text-xs t-text-gray-500">Gastos</div>
    </div>
    <div class="t-text-center">
      <div class="t-text-2xl t-font-bold ${balanceClass}">$${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
      <div class="t-text-xs t-text-gray-500">Balance</div>
    </div>
  `;
}

async function cargarPendientes() {
  try {
    const response = await fetch('/transacciones/api/pendientes');
    const data = await response.json();
    
    if (data.ok) {
      pendientesData = data.pendientes;
      actualizarPendientes();
    }
  } catch (error) {
    console.error('Error cargando pendientes:', error);
  }
}

function actualizarPendientes() {
  const contenedor = document.getElementById('transaccionesPendientes');
  
  if (pendientesData.length === 0) {
    contenedor.innerHTML = `
      <div class="t-text-center t-py-4 t-text-gray-500">
        <i class="fas fa-check-circle t-text-3xl t-mb-2"></i>
        <div>No hay transacciones pendientes</div>
      </div>
    `;
    return;
  }

  let html = '<div class="t-space-y-2 t-max-h-40 t-overflow-y-auto">';
  
  pendientesData.slice(0, 5).forEach(transaccion => {
    const esSuOrigenPendiente = transaccion.usuarioOrigenId == (window.usuarioActual && window.usuarioActual.id) && transaccion.estadoOrigen === 'Pendiente';
    const esSuDestinoPendiente = transaccion.usuarioDestinoId == (window.usuarioActual && window.usuarioActual.id) && transaccion.estadoDestino === 'Pendiente';
    
    if (esSuOrigenPendiente || esSuDestinoPendiente) {
      const otroUsuario = esSuOrigenPendiente ? transaccion.usuarioDestino : transaccion.usuarioOrigen;
      const accion = esSuOrigenPendiente ? 'confirmar entrega' : 'confirmar recibo';
      
      html += `
        <div class="t-flex t-justify-between t-items-center t-bg-yellow-50 t-p-2 t-rounded t-border t-border-yellow-200">
          <div class="t-flex-1">
            <div class="t-text-sm t-font-medium">$${parseFloat(transaccion.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            <div class="t-text-xs t-text-gray-600">${otroUsuario.nombreCompleto}</div>
            <div class="t-text-xs t-text-gray-500">${transaccion.concepto || 'Sin concepto'}</div>
          </div>
          <div class="t-flex t-gap-1">
            <button onclick="confirmarTransaccionDirecta(${transaccion.id}, 'confirmar')" 
                    class="t-bg-green-500 hover:t-bg-green-600 t-text-white t-px-3 t-py-2 t-rounded t-text-lg" 
                    title="Confirmar">
              <i class="fas fa-thumbs-up"></i>
            </button>
            <button onclick="confirmarTransaccionDirecta(${transaccion.id}, 'rechazar')" 
                    class="t-bg-red-500 hover:t-bg-red-600 t-text-white t-px-3 t-py-2 t-rounded t-text-lg" 
                    title="Rechazar">
              <i class="fas fa-thumbs-down"></i>
            </button>
          </div>
        </div>
      `;
    }
  });
  
  html += '</div>';
  
  if (pendientesData.length > 5) {
    html += `<div class="t-text-xs t-text-gray-500 t-text-center t-mt-2">+ ${pendientesData.length - 5} más...</div>`;
  }
  
  contenedor.innerHTML = html;
}

async function cargarTransacciones() {
  try {
    const params = new URLSearchParams();
    
    Object.keys(filtrosActivos).forEach(key => {
      if (filtrosActivos[key]) {
        params.append(key, filtrosActivos[key]);
      }
    });
    
    const response = await fetch(`/transacciones/api/listar?${params}`);
    const data = await response.json();
    
    if (data.ok) {
      transaccionesData = data.transacciones;
      actualizarTabla();
      actualizarContador(data.transacciones.length);
    } else {
      mostrarAlerta('Error al cargar transacciones', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

function actualizarTabla() {
  tablaTransacciones.clear();
  
  transaccionesData.forEach(transaccion => {
    const fecha = formatearFecha(transaccion.fecha);
    
    // Determinar la dirección de la transacción para el usuario actual
    const esOrigen = transaccion.usuarioOrigenId == (window.usuarioActual && window.usuarioActual.id);
    const esDestino = transaccion.usuarioDestinoId == (window.usuarioActual && window.usuarioActual.id);
    
    let tipoMostrar = transaccion.tipoMovimiento;
    let otroUsuario = '';
    let direccionIcon = '';
    
    if (esOrigen) {
      otroUsuario = `Para: ${transaccion.usuarioDestino.nombreCompleto}`;
      direccionIcon = 'fa-arrow-right t-text-red-600';
    } else if (esDestino) {
      otroUsuario = `De: ${transaccion.usuarioOrigen.nombreCompleto}`;
      direccionIcon = 'fa-arrow-left t-text-green-600';
    } else {
      // Transacción creada por el usuario pero no participa
      otroUsuario = `${transaccion.usuarioOrigen.nombreCompleto} → ${transaccion.usuarioDestino.nombreCompleto}`;
      direccionIcon = 'fa-exchange-alt t-text-blue-600';
    }
    
    const tipo = `<div class="t-flex t-items-center">
                    <i class="fas ${direccionIcon} t-mr-2"></i>
                    <div>
                      <div class="t-font-medium">${tipoMostrar}</div>
                      ${transaccion.tipoGasto ? `<div class="t-text-xs t-text-gray-500">${transaccion.tipoGasto}</div>` : ''}
                    </div>
                  </div>`;
    
    const deOraPara = `<div class="t-text-sm">
                        <div class="t-font-medium">${otroUsuario}</div>
                        ${transaccion.obra ? `<div class="t-text-xs t-text-gray-500">Obra: ${transaccion.obra.nombre}</div>` : ''}
                        ${transaccion.proveedorNombre ? `<div class="t-text-xs t-text-gray-500">Proveedor: ${transaccion.proveedorNombre}</div>` : ''}
                      </div>`;
    
    const tipoClass = esDestino ? 't-text-green-600' : 't-text-red-600';
    const monto = `<div class="t-text-right t-font-semibold ${tipoClass}">
                    $${parseFloat(transaccion.monto).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>`;
    
    const concepto = `<div class="t-max-w-xs t-truncate" title="${transaccion.concepto || 'Sin concepto'}">
                        ${transaccion.concepto || '<em class="t-text-gray-400">Sin concepto</em>'}
                      </div>`;
    
    // Estado de la transacción
    let estadoHtml = '';
    const estadoOrigen = transaccion.estadoOrigen;
    const estadoDestino = transaccion.estadoDestino;
    
    if (estadoOrigen === 'Confirmado' && estadoDestino === 'Confirmado') {
      estadoHtml = '<span class="t-bg-green-100 t-text-green-800 t-px-2 t-py-1 t-rounded t-text-xs">Confirmado</span>';
    } else if (estadoOrigen === 'Rechazado' || estadoDestino === 'Rechazado') {
      estadoHtml = '<span class="t-bg-red-100 t-text-red-800 t-px-2 t-py-1 t-rounded t-text-xs">Rechazado</span>';
    } else {
      const pendienteOrigen = estadoOrigen === 'Pendiente';
      const pendienteDestino = estadoDestino === 'Pendiente';
      
      if (pendienteOrigen && pendienteDestino) {
        estadoHtml = '<span class="t-bg-yellow-100 t-text-yellow-800 t-px-2 t-py-1 t-rounded t-text-xs">Pendiente</span>';
      } else if (pendienteOrigen) {
        estadoHtml = '<span class="t-bg-yellow-100 t-text-yellow-800 t-px-2 t-py-1 t-rounded t-text-xs">Pendiente origen</span>';
      } else {
        estadoHtml = '<span class="t-bg-yellow-100 t-text-yellow-800 t-px-2 t-py-1 t-rounded t-text-xs">Pendiente destino</span>';
      }
    }
    
    // Acciones
    let acciones = '<div class="t-flex t-gap-2">';
    
    // Botones confirmar/rechazar si está pendiente y el usuario puede actuar
    if ((esOrigen && estadoOrigen === 'Pendiente') || (esDestino && estadoDestino === 'Pendiente')) {
      acciones += `
        <button onclick="confirmarTransaccionDirecta(${transaccion.id}, 'confirmar')" 
                class="t-bg-green-500 hover:t-bg-green-600 t-text-white t-px-2 t-py-1 t-rounded t-text-sm t-mr-1" 
                title="Confirmar">
          <i class="fas fa-thumbs-up"></i>
        </button>
        <button onclick="confirmarTransaccionDirecta(${transaccion.id}, 'rechazar')" 
                class="t-bg-red-500 hover:t-bg-red-600 t-text-white t-px-2 t-py-1 t-rounded t-text-sm" 
                title="Rechazar">
          <i class="fas fa-thumbs-down"></i>
        </button>`;
    }
    
    // Botón eliminar si puede eliminar
    if (transaccion.creadoPorId == (window.usuarioActual && window.usuarioActual.id) && 
        !(estadoOrigen === 'Confirmado' && estadoDestino === 'Confirmado')) {
      acciones += `<button onclick="eliminarTransaccion(${transaccion.id})" 
                            class="t-text-red-600 hover:t-text-red-800 t-text-sm" title="Eliminar">
                      <i class="fas fa-trash"></i>
                    </button>`;
    }
    
    acciones += '</div>';
    
    tablaTransacciones.row.add([
      fecha,
      tipo,
      deOraPara,
      concepto,
      monto,
      estadoHtml,
      acciones
    ]);
  });
  
  tablaTransacciones.draw();
}

function actualizarContador(cantidad) {
  const contador = document.getElementById('contadorTransacciones');
  if (contador) {
    contador.textContent = `Mostrando ${cantidad} transacción${cantidad !== 1 ? 'es' : ''}`;
  }
}

function formatearFecha(fecha) {
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Funciones del modal principal
async function abrirModalTransaccion(id = null) {
  const modal = document.getElementById('modalTransaccion');
  const form = document.getElementById('transaccionForm');
  const title = document.getElementById('modalTitle');
  
  form.reset();
  document.getElementById('transaccionId').value = '';
  
  // Obtener período actual y configurar el formulario
  try {
    const response = await fetch('/transacciones/api/balance');
    const data = await response.json();
    
    if (!data.ok || !data.periodo) {
      mostrarAlerta('No hay período activo para registrar transacciones', 'danger');
      return;
    }
    
    const periodo = data.periodo;
    const fechaInput = document.getElementById('fecha');
    
    // Establecer límites del calendario
    fechaInput.min = periodo.fechaInicio;
    fechaInput.max = periodo.fechaFin;
    fechaInput.value = new Date().toISOString().split('T')[0];
    
    // Mostrar información del período
    document.getElementById('infoPeriodo').innerHTML = 
      `<strong>Período:</strong> ${periodo.descripcion} | <strong>Fechas permitidas:</strong> ${formatearFecha(periodo.fechaInicio)} - ${formatearFecha(periodo.fechaFin)}`;
    
  } catch (error) {
    console.error('Error obteniendo período:', error);
    mostrarAlerta('Error al obtener información del período', 'danger');
    return;
  }
  
  if (id) {
    title.textContent = 'Editar Transacción';
    // TODO: cargar datos de la transacción
  } else {
    title.textContent = 'Nueva Transacción';
  }
  
  // Resetear campos condicionales
  cambiarTipoMovimiento();
  
  modal.classList.remove('t-hidden');
}

function cerrarModal() {
  document.getElementById('modalTransaccion').classList.add('t-hidden');
}

function cerrarModalConfirmar() {
  document.getElementById('modalConfirmar').classList.add('t-hidden');
}

function cambiarTipoMovimiento() {
  const tipoMovimiento = document.getElementById('tipoMovimiento').value;
  const usuarioOrigenGroup = document.getElementById('usuarioOrigenGroup');
  const usuarioDestinoGroup = document.getElementById('usuarioDestinoGroup');
  const tipoGastoGroup = document.getElementById('tipoGastoGroup');
  
  // Resetear campos
  document.getElementById('usuarioOrigenId').value = '';
  document.getElementById('usuarioDestinoId').value = '';
  document.getElementById('tipoGasto').value = '';
  
  // Ocultar todos los grupos condicionales
  tipoGastoGroup.classList.add('t-hidden');
  cambiarTipoGasto(); // Ocultar campos de gasto
  
  if (tipoMovimiento === 'Ingreso') {
    // Yo recibo dinero - soy el destino
    document.getElementById('usuarioDestinoId').value = (window.usuarioActual && window.usuarioActual.id) || '';
    usuarioOrigenGroup.classList.remove('t-hidden');
    usuarioDestinoGroup.classList.add('t-hidden');
  } else if (tipoMovimiento === 'Egreso') {
    // Yo entrego dinero - soy el origen
    document.getElementById('usuarioOrigenId').value = (window.usuarioActual && window.usuarioActual.id) || '';
    usuarioOrigenGroup.classList.add('t-hidden');
    usuarioDestinoGroup.classList.remove('t-hidden');
  } else if (tipoMovimiento === 'Gasto') {
    // Gasto - yo soy el origen, el destino depende del tipo de gasto
    document.getElementById('usuarioOrigenId').value = (window.usuarioActual && window.usuarioActual.id) || '';
    usuarioOrigenGroup.classList.add('t-hidden');
    usuarioDestinoGroup.classList.remove('t-hidden');
    tipoGastoGroup.classList.remove('t-hidden');
  } else {
    // Sin selección - mostrar ambos
    usuarioOrigenGroup.classList.remove('t-hidden');
    usuarioDestinoGroup.classList.remove('t-hidden');
  }
}

function cambiarTipoGasto() {
  const tipoGasto = document.getElementById('tipoGasto').value;
  const obraGroup = document.getElementById('obraGroup');
  const proveedorGroup = document.getElementById('proveedorGroup');
  
  // Ocultar todos los grupos
  obraGroup.classList.add('t-hidden');
  proveedorGroup.classList.add('t-hidden');
  
  // Resetear campos
  document.getElementById('obraId').value = '';
  document.getElementById('proveedorNombre').value = '';
  document.getElementById('usuarioDestinoId').value = '';
  
  if (tipoGasto === 'Obra') {
    obraGroup.classList.remove('t-hidden');
    // Para gastos de obra, el destino podría ser un usuario específico o "la obra"
    document.getElementById('usuarioDestinoId').value = (window.usuarioActual && window.usuarioActual.id) || ''; // Temporal
  } else if (tipoGasto === 'Proveedor') {
    proveedorGroup.classList.remove('t-hidden');
    // Para proveedores, necesitamos seleccionar un usuario destino
  }
  // Para "Otro" no se muestran campos adicionales
}

async function guardarTransaccion(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const transaccionId = formData.get('transaccionId');
  
  const datos = {
    fecha: formData.get('fecha'),
    usuarioOrigenId: formData.get('usuarioOrigenId'),
    usuarioDestinoId: formData.get('usuarioDestinoId'),
    tipoMovimiento: formData.get('tipoMovimiento'),
    tipoGasto: formData.get('tipoGasto') || null,
    obraId: formData.get('obraId') || null,
    proveedorNombre: formData.get('proveedorNombre') || null,
    concepto: formData.get('concepto'),
    formaPago: formData.get('formaPago'),
    monto: formData.get('monto'),
    observaciones: formData.get('observaciones') || null
  };
  
  try {
    const url = transaccionId ? `/transacciones/${transaccionId}` : '/transacciones/crear';
    const method = transaccionId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModal();
      // Data will be reloaded via socket event for the other user
      // Current user still needs manual reload since they created the transaction
      cargarDatosPrincipales();
    } else {
      if (data.errores) {
        mostrarAlerta(data.errores.join(', '), 'danger');
      } else {
        mostrarAlerta(data.mensaje, 'danger');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

async function abrirModalConfirmar(id) {
  try {
    const response = await fetch(`/transacciones/api/${id}`);
    const data = await response.json();
    
    if (!data.ok) {
      mostrarAlerta('Error al cargar transacción', 'danger');
      return;
    }
    
    const transaccion = data.transaccion;
    transaccionActualId = id;
    
    // Mostrar detalles de la transacción
    const detalleDiv = document.getElementById('detalleTransaccion');
    detalleDiv.innerHTML = `
      <div class="t-bg-gray-50 t-p-4 t-rounded">
        <div class="t-grid t-grid-cols-2 t-gap-2 t-text-sm">
          <div><strong>Fecha:</strong> ${formatearFecha(transaccion.fecha)}</div>
          <div><strong>Tipo:</strong> ${transaccion.tipoMovimiento}</div>
          <div><strong>De:</strong> ${transaccion.usuarioOrigen.nombreCompleto}</div>
          <div><strong>Para:</strong> ${transaccion.usuarioDestino.nombreCompleto}</div>
          <div class="t-col-span-2"><strong>Concepto:</strong> ${transaccion.concepto || '<em>Sin concepto</em>'}</div>
          <div class="t-col-span-2"><strong>Monto:</strong> $${parseFloat(transaccion.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      <div class="t-mt-3 t-text-center t-text-sm t-text-gray-600">
        ¿Confirma que esta transacción es correcta?
      </div>
    `;
    
    document.getElementById('modalConfirmar').classList.remove('t-hidden');
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al cargar detalles de la transacción', 'danger');
  }
}

async function confirmarTransaccion(accion) {
  try {
    const response = await fetch(`/transacciones/confirmar/${transaccionActualId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accion })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModalConfirmar();
      cargarDatosPrincipales();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

async function confirmarTransaccionDirecta(id, accion) {
  try {
    const response = await fetch(`/transacciones/confirmar/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accion })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      const mensaje = accion === 'confirmar' ? 'Transacción confirmada correctamente' : 'Transacción rechazada correctamente';
      mostrarAlerta(mensaje, 'success');
      // Data will be reloaded via socket event, no need to manually reload here
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

async function eliminarTransaccion(id) {
  if (!confirm('¿Está seguro de eliminar esta transacción?')) {
    return;
  }
  
  try {
    const response = await fetch(`/transacciones/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cargarDatosPrincipales();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

// Funciones de filtros
function aplicarFiltros() {
  cargarTransacciones();
}

function limpiarFiltros() {
  document.getElementById('fechaInicio').value = '';
  document.getElementById('fechaFin').value = '';
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroEstado').value = '';
  
  filtrosActivos = {
    fechaInicio: '',
    fechaFin: '',
    tipoMovimiento: '',
    estado: ''
  };
  
  cargarTransacciones();
}

// Función de alertas
function mostrarAlerta(mensaje, tipo) {
  const alertClass = {
    success: 't-bg-green-100 t-border-green-400 t-text-green-700',
    danger: 't-bg-red-100 t-border-red-400 t-text-red-700',
    warning: 't-bg-yellow-100 t-border-yellow-400 t-text-yellow-700',
    info: 't-bg-blue-100 t-border-blue-400 t-text-blue-700'
  };
  
  const alert = document.createElement('div');
  alert.className = `t-border t-px-4 t-py-3 t-rounded t-relative t-mb-4 ${alertClass[tipo] || alertClass.info}`;
  alert.innerHTML = `
    <span class="t-block sm:t-inline">${mensaje}</span>
    <span class="t-absolute t-top-0 t-bottom-0 t-right-0 t-px-4 t-py-3">
      <svg class="t-fill-current t-h-6 t-w-6 t-cursor-pointer" role="button" onclick="this.parentElement.parentElement.remove()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <title>Cerrar</title>
        <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
      </svg>
    </span>
  `;
  
  const container = document.getElementById('alertContainer');
  container.appendChild(alert);
  
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove();
    }
  }, 5000);
}

// El usuario actual se establecerá desde el template EJS
window.usuarioActual = window.usuarioActual || {};