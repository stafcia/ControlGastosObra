let tablaMovimientos;
let movimientosData = [];
let obrasData = [];
let filtrosActivos = {
  fechaInicio: '',
  fechaFin: '',
  obraId: '',
  tipo: '',
  formaPago: '',
  responsable: ''
};

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(() => {
    inicializarTabla();
    cargarObras();
    cargarMovimientos();
    cargarResumenFinanciero();
    inicializarEventos();
  }, 100);
});

function inicializarTabla() {
  tablaMovimientos = $('#tablaMovimientos').DataTable({
    language: {
      "sProcessing": "Procesando...",
      "sLengthMenu": "Mostrar _MENU_ registros",
      "sZeroRecords": "No se encontraron movimientos",
      "sEmptyTable": "No hay movimientos registrados",
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
        targets: 7 // Columna de acciones
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
  
  // Form submit
  document.getElementById('movimientoForm').addEventListener('submit', guardarMovimiento);
  
  // File upload
  const comprobantesInput = document.getElementById('comprobantes');
  if (comprobantesInput) {
    comprobantesInput.addEventListener('change', manejarArchivos);
  }
  
  // Filtros
  document.getElementById('fechaInicio').addEventListener('change', () => {
    filtrosActivos.fechaInicio = document.getElementById('fechaInicio').value;
  });
  
  document.getElementById('fechaFin').addEventListener('change', () => {
    filtrosActivos.fechaFin = document.getElementById('fechaFin').value;
  });
  
  document.getElementById('filtroObra').addEventListener('change', () => {
    filtrosActivos.obraId = document.getElementById('filtroObra').value;
  });
  
  document.getElementById('filtroTipo').addEventListener('change', () => {
    filtrosActivos.tipo = document.getElementById('filtroTipo').value;
  });
}

async function cargarObras() {
  try {
    const response = await fetch('/movimientos/api/obras');
    const data = await response.json();
    
    if (data.ok) {
      obrasData = data.obras;
      actualizarDropdownObras();
    } else {
      mostrarAlerta('Error al cargar obras', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión al cargar obras', 'danger');
  }
}

function actualizarDropdownObras() {
  const selectObra = document.getElementById('obraId');
  const filtroObra = document.getElementById('filtroObra');
  
  // Limpiar opciones existentes
  selectObra.innerHTML = '<option value="">Seleccione una obra</option>';
  filtroObra.innerHTML = '<option value="">Todas las obras</option>';
  
  // Agregar obras
  obrasData.forEach(obra => {
    const optionModal = document.createElement('option');
    optionModal.value = obra.id;
    optionModal.textContent = `${obra.nombre} - ${obra.clienteNombre}`;
    selectObra.appendChild(optionModal);
    
    const optionFiltro = document.createElement('option');
    optionFiltro.value = obra.id;
    optionFiltro.textContent = `${obra.nombre} - ${obra.clienteNombre}`;
    filtroObra.appendChild(optionFiltro);
  });
}

async function cargarMovimientos() {
  try {
    const params = new URLSearchParams();
    
    Object.keys(filtrosActivos).forEach(key => {
      if (filtrosActivos[key]) {
        params.append(key, filtrosActivos[key]);
      }
    });
    
    const response = await fetch(`/movimientos/api/listar?${params}`);
    const data = await response.json();
    
    if (data.ok) {
      movimientosData = data.movimientos;
      actualizarTabla();
      actualizarContador(data.movimientos.length);
      actualizarResumenFiltrado(data.resumen);
    } else {
      mostrarAlerta('Error al cargar movimientos', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

function actualizarTabla() {
  tablaMovimientos.clear();
  
  movimientosData.forEach(movimiento => {
    const fecha = formatearFecha(movimiento.fecha);
    const obra = `<div class="t-truncate" title="${movimiento.obra.nombre} - ${movimiento.obra.clienteNombre}">
                    <div class="t-font-medium t-text-sm">${movimiento.obra.nombre}</div>
                    <div class="t-text-xs t-text-gray-500">${movimiento.obra.clienteNombre}</div>
                  </div>`;
    
    const tipoClass = movimiento.tipo === 'Ingreso' ? 't-text-green-600' : 't-text-red-600';
    const tipoIcon = movimiento.tipo === 'Ingreso' ? 'fa-arrow-up' : 'fa-arrow-down';
    const tipo = `<span class="${tipoClass} t-font-medium">
                    <i class="fas ${tipoIcon} t-mr-1"></i>${movimiento.tipo}
                  </span>`;
    
    const monto = `<div class="t-text-right t-font-semibold ${tipoClass}">
                    $${parseFloat(movimiento.monto).toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>`;
    
    const concepto = `<div class="t-max-w-xs t-truncate" title="${movimiento.concepto}">
                        ${movimiento.concepto}
                      </div>`;
    
    const usuario = `<div class="t-text-sm">
                       <div class="t-font-medium">${movimiento.usuario.nombreCompleto}</div>
                       <div class="t-text-xs t-text-gray-500">${movimiento.usuario.nombreUsuario}</div>
                     </div>`;
    
    const acciones = `<div class="t-flex t-gap-2">
                        <button onclick="editarMovimiento(${movimiento.id})" 
                                class="t-text-blue-600 hover:t-text-blue-800 t-text-sm" title="Editar">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="eliminarMovimiento(${movimiento.id})" 
                                class="t-text-red-600 hover:t-text-red-800 t-text-sm" title="Eliminar">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>`;
    
    tablaMovimientos.row.add([
      fecha,
      obra,
      tipo,
      movimiento.formaPago,
      monto,
      concepto,
      usuario,
      acciones
    ]);
  });
  
  tablaMovimientos.draw();
}

async function cargarResumenFinanciero() {
  try {
    const response = await fetch('/movimientos/api/resumen');
    const data = await response.json();
    
    if (data.ok) {
      actualizarResumenFinanciero(data.resumen);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function actualizarResumenFinanciero(resumen) {
  const contenedor = document.getElementById('resumenFinanciero');
  
  const ingresos = parseFloat(resumen.ingresos) || 0;
  const egresos = parseFloat(resumen.egresos) || 0;
  const balance = parseFloat(resumen.balance) || 0;
  
  const balanceClass = balance >= 0 ? 't-text-green-600' : 't-text-red-600';
  const balanceIcon = balance >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
  
  contenedor.innerHTML = `
    <div class="t-bg-green-50 t-p-4 t-rounded-lg t-border t-border-green-200">
      <div class="t-flex t-items-center t-justify-between">
        <div>
          <p class="t-text-sm t-text-green-600 t-font-medium">Ingresos</p>
          <p class="t-text-2xl t-font-bold t-text-green-700">
            $${ingresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <i class="fas fa-arrow-up t-text-3xl t-text-green-500"></i>
      </div>
    </div>
    
    <div class="t-bg-red-50 t-p-4 t-rounded-lg t-border t-border-red-200">
      <div class="t-flex t-items-center t-justify-between">
        <div>
          <p class="t-text-sm t-text-red-600 t-font-medium">Egresos</p>
          <p class="t-text-2xl t-font-bold t-text-red-700">
            $${egresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <i class="fas fa-arrow-down t-text-3xl t-text-red-500"></i>
      </div>
    </div>
    
    <div class="t-bg-gray-50 t-p-4 t-rounded-lg t-border t-border-gray-200">
      <div class="t-flex t-items-center t-justify-between">
        <div>
          <p class="t-text-sm t-text-gray-600 t-font-medium">Balance</p>
          <p class="t-text-2xl t-font-bold ${balanceClass}">
            $${balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <i class="fas ${balanceIcon} t-text-3xl ${balanceClass}"></i>
      </div>
    </div>
  `;
}

function actualizarResumenFiltrado(resumen) {
  if (resumen) {
    actualizarResumenFinanciero(resumen);
  }
}

function actualizarContador(cantidad) {
  const contador = document.getElementById('contadorMovimientos');
  if (contador) {
    contador.textContent = `Mostrando ${cantidad} movimiento${cantidad !== 1 ? 's' : ''}`;
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

// Funciones del modal
function abrirModalMovimiento(id = null) {
  const modal = document.getElementById('modalMovimiento');
  const form = document.getElementById('movimientoForm');
  const title = document.getElementById('modalTitle');
  
  form.reset();
  document.getElementById('movimientoId').value = '';
  
  if (id) {
    title.textContent = 'Editar Movimiento';
    cargarDatosMovimiento(id);
  } else {
    title.textContent = 'Nuevo Movimiento';
    // Establecer fecha actual
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
  }
  
  modal.classList.remove('t-hidden');
}

function cerrarModal() {
  document.getElementById('modalMovimiento').classList.add('t-hidden');
}

async function cargarDatosMovimiento(id) {
  try {
    const response = await fetch(`/movimientos/api/${id}`);
    const data = await response.json();
    
    if (data.ok) {
      const movimiento = data.movimiento;
      document.getElementById('movimientoId').value = movimiento.id;
      document.getElementById('fecha').value = movimiento.fecha;
      document.getElementById('obraId').value = movimiento.obraId;
      document.getElementById('tipo').value = movimiento.tipo;
      document.getElementById('responsable').value = movimiento.responsable;
      document.getElementById('formaPago').value = movimiento.formaPago;
      document.getElementById('monto').value = movimiento.monto;
      document.getElementById('concepto').value = movimiento.concepto;
    } else {
      mostrarAlerta('Error al cargar datos del movimiento', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

async function guardarMovimiento(event) {
  event.preventDefault();
  
  const form = event.target;
  const formData = new FormData(form);
  const movimientoId = formData.get('movimientoId');
  
  const datos = {
    fecha: formData.get('fecha'),
    obraId: formData.get('obraId'),
    tipo: formData.get('tipo'),
    responsable: formData.get('responsable'),
    formaPago: formData.get('formaPago'),
    monto: formData.get('monto'),
    concepto: formData.get('concepto')
  };
  
  try {
    const url = movimientoId ? `/movimientos/${movimientoId}` : '/movimientos/crear';
    const method = movimientoId ? 'PUT' : 'POST';
    
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
      cargarMovimientos();
      cargarResumenFinanciero();
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

async function editarMovimiento(id) {
  abrirModalMovimiento(id);
}

async function eliminarMovimiento(id) {
  if (!confirm('¿Está seguro de eliminar este movimiento?')) {
    return;
  }
  
  try {
    const response = await fetch(`/movimientos/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cargarMovimientos();
      cargarResumenFinanciero();
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
  cargarMovimientos();
}

function limpiarFiltros() {
  document.getElementById('fechaInicio').value = '';
  document.getElementById('fechaFin').value = '';
  document.getElementById('filtroObra').value = '';
  document.getElementById('filtroTipo').value = '';
  
  filtrosActivos = {
    fechaInicio: '',
    fechaFin: '',
    obraId: '',
    tipo: '',
    formaPago: '',
    responsable: ''
  };
  
  cargarMovimientos();
}

// Manejo de archivos
function manejarArchivos(event) {
  const files = event.target.files;
  const listaArchivos = document.getElementById('listaArchivos');
  
  if (files.length > 0) {
    let html = '<div class="t-mt-2"><p class="t-text-sm t-text-gray-600 t-mb-2">Archivos seleccionados:</p>';
    
    for (let i = 0; i < files.length; i++) {
      html += `<div class="t-text-sm t-text-gray-800">${files[i].name}</div>`;
    }
    
    html += '</div>';
    listaArchivos.innerHTML = html;
    listaArchivos.classList.remove('t-hidden');
  } else {
    listaArchivos.classList.add('t-hidden');
  }
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