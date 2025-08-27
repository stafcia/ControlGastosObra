let tablaPeriodos;
let periodosData = [];
let usuariosPendientes = [];

document.addEventListener('DOMContentLoaded', function() {
  inicializarTabla();
  cargarPeriodos();
  cargarPeriodoActual();
});

function inicializarTabla() {
  tablaPeriodos = $('#tablaPeriodos').DataTable({
    language: {
      url: '//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json'
    },
    order: [[1, 'desc'], [0, 'desc']],
    columnDefs: [
      { orderable: false, targets: 6 }
    ],
    pageLength: 10,
    responsive: true
  });
}

async function cargarPeriodos() {
  try {
    const response = await fetch('/periodos/api/listar');
    const data = await response.json();
    
    if (data.ok) {
      periodosData = data.periodos;
      actualizarTabla();
    } else {
      mostrarAlerta('Error al cargar períodos', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

async function cargarPeriodoActual() {
  try {
    const response = await fetch('/periodos/api/actual');
    const data = await response.json();
    
    if (data.ok && data.periodo) {
      mostrarPeriodoActual(data.periodo);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function mostrarPeriodoActual(periodo) {
  const hoy = new Date();
  const fechaFin = new Date(periodo.fechaFin);
  const diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
  
  let alertaClass = 't-bg-green-100 t-text-green-800';
  if (diasRestantes <= 3) {
    alertaClass = 't-bg-red-100 t-text-red-800';
  } else if (diasRestantes <= 7) {
    alertaClass = 't-bg-yellow-100 t-text-yellow-800';
  }
  
  document.getElementById('periodoActualInfo').innerHTML = `
    <div class="t-bg-blue-50 t-p-4 t-rounded">
      <p class="t-text-sm t-text-gray-600">Período</p>
      <p class="t-font-semibold t-text-gray-900">${periodo.descripcion}</p>
    </div>
    <div class="t-bg-gray-50 t-p-4 t-rounded">
      <p class="t-text-sm t-text-gray-600">Fechas</p>
      <p class="t-font-semibold t-text-gray-900">${formatearFecha(periodo.fechaInicio)} - ${formatearFecha(periodo.fechaFin)}</p>
    </div>
    <div class="${alertaClass} t-p-4 t-rounded">
      <p class="t-text-sm">Días Restantes</p>
      <p class="t-font-semibold t-text-lg">${diasRestantes} días</p>
    </div>
    <div class="t-bg-gray-50 t-p-4 t-rounded">
      <p class="t-text-sm t-text-gray-600">Estado</p>
      <p class="t-font-semibold t-text-gray-900">
        <span class="t-inline-flex t-items-center t-px-2 t-py-1 t-rounded-full t-text-xs t-font-medium t-bg-green-100 t-text-green-800">
          <i class="fas fa-circle t-mr-1 t-text-xs"></i>Activo
        </span>
      </p>
    </div>
  `;
}

function actualizarTabla() {
  tablaPeriodos.clear();
  
  periodosData.forEach(periodo => {
    const fechaInicio = formatearFecha(periodo.fechaInicio);
    const fechaFin = formatearFecha(periodo.fechaFin);
    
    // Determinar estado
    const hoy = new Date();
    const fechaInicioDate = new Date(periodo.fechaInicio);
    const fechaFinDate = new Date(periodo.fechaFin);
    
    let estado = '';
    if (periodo.activo) {
      estado = '<span class="t-px-2 t-py-1 t-text-xs t-rounded-full t-bg-green-100 t-text-green-800">Activo</span>';
    } else if (hoy > fechaFinDate) {
      estado = '<span class="t-px-2 t-py-1 t-text-xs t-rounded-full t-bg-gray-100 t-text-gray-800">Finalizado</span>';
    } else if (hoy < fechaInicioDate) {
      estado = '<span class="t-px-2 t-py-1 t-text-xs t-rounded-full t-bg-blue-100 t-text-blue-800">Próximo</span>';
    } else {
      estado = '<span class="t-px-2 t-py-1 t-text-xs t-rounded-full t-bg-yellow-100 t-text-yellow-800">En curso</span>';
    }
    
    // Barra de progreso de cierres
    const porcentaje = periodo.porcentajeCierre || 0;
    let colorBarra = 'bg-green-600';
    if (porcentaje < 50) colorBarra = 'bg-red-600';
    else if (porcentaje < 80) colorBarra = 'bg-yellow-600';
    
    const progreso = `
      <div class="t-w-full">
        <div class="t-flex t-justify-between t-mb-1">
          <span class="t-text-xs t-text-gray-600">${periodo.usuariosCerrados}/${periodo.totalUsuarios}</span>
          <span class="t-text-xs t-font-medium t-text-gray-700">${porcentaje}%</span>
        </div>
        <div class="t-w-full t-bg-gray-200 t-rounded-full t-h-2">
          <div class="${colorBarra} t-h-2 t-rounded-full t-transition-all" style="width: ${porcentaje}%"></div>
        </div>
      </div>
    `;
    
    // Botones de acción
    const acciones = `
      <div class="t-flex t-gap-2">
        <button onclick="verEstadoCierres(${periodo.id})" 
                class="t-text-blue-600 hover:t-text-blue-800" title="Ver estado de cierres">
          <i class="fas fa-eye"></i>
        </button>
        <button onclick="abrirModalCerrar(${periodo.id})" 
                class="t-text-orange-600 hover:t-text-orange-800" title="Cerrar período">
          <i class="fas fa-lock"></i>
        </button>
        ${!periodo.activo ? `
        <button onclick="activarPeriodo(${periodo.id})" 
                class="t-text-green-600 hover:t-text-green-800" title="Activar período">
          <i class="fas fa-check-circle"></i>
        </button>` : ''}
      </div>
    `;
    
    tablaPeriodos.row.add([
      periodo.descripcion,
      periodo.año,
      fechaInicio,
      fechaFin,
      estado,
      progreso,
      acciones
    ]);
  });
  
  tablaPeriodos.draw();
}

function formatearFecha(fecha) {
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function generarPeriodos() {
  document.getElementById('modalGenerarPeriodos').classList.remove('t-hidden');
  document.getElementById('modalGenerarPeriodos').classList.add('t-flex');
}

function cerrarModalGenerar() {
  document.getElementById('modalGenerarPeriodos').classList.add('t-hidden');
  document.getElementById('modalGenerarPeriodos').classList.remove('t-flex');
}

async function confirmarGenerarPeriodos() {
  const año = document.getElementById('año').value;
  
  if (!año) {
    mostrarAlerta('Por favor ingrese un año válido', 'warning');
    return;
  }
  
  try {
    const response = await fetch('/periodos/api/generar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ año: parseInt(año) })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModalGenerar();
      cargarPeriodos();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al generar períodos', 'danger');
  }
}

async function verEstadoCierres(periodoId) {
  try {
    const response = await fetch(`/periodos/api/${periodoId}/estado-cierres`);
    const data = await response.json();
    
    if (data.ok) {
      mostrarEstadoCierres(data);
    } else {
      mostrarAlerta('Error al cargar estado de cierres', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

function mostrarEstadoCierres(data) {
  const { periodo, usuariosConCierre, usuariosSinCierre } = data;
  
  let htmlCerrados = '<p class="t-text-gray-600 t-text-sm">No hay usuarios con el período cerrado</p>';
  if (usuariosConCierre && usuariosConCierre.length > 0) {
    htmlCerrados = `
      <div class="t-overflow-x-auto">
        <table class="t-min-w-full t-divide-y t-divide-gray-200">
          <thead class="t-bg-gray-50">
            <tr>
              <th class="t-px-4 t-py-2 t-text-left t-text-xs t-font-medium t-text-gray-500">Usuario</th>
              <th class="t-px-4 t-py-2 t-text-left t-text-xs t-font-medium t-text-gray-500">Cerrado Por</th>
              <th class="t-px-4 t-py-2 t-text-left t-text-xs t-font-medium t-text-gray-500">Fecha Cierre</th>
              <th class="t-px-4 t-py-2 t-text-left t-text-xs t-font-medium t-text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody class="t-bg-white t-divide-y t-divide-gray-200">
            ${usuariosConCierre.map(cierre => `
              <tr>
                <td class="t-px-4 t-py-2 t-text-sm">${cierre.usuario.nombreCompleto}</td>
                <td class="t-px-4 t-py-2 t-text-sm">${cierre.cerradoPor.nombreCompleto}</td>
                <td class="t-px-4 t-py-2 t-text-sm">${new Date(cierre.fechaCierre).toLocaleString()}</td>
                <td class="t-px-4 t-py-2 t-text-sm">
                  <button onclick="reabrirPeriodo(${cierre.id})" 
                          class="t-text-red-600 hover:t-text-red-800" title="Reabrir período">
                    <i class="fas fa-unlock"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  let htmlPendientes = '<p class="t-text-gray-600 t-text-sm">Todos los usuarios tienen el período cerrado</p>';
  if (usuariosSinCierre && usuariosSinCierre.length > 0) {
    htmlPendientes = `
      <div class="t-grid t-grid-cols-1 md:t-grid-cols-2 t-gap-2">
        ${usuariosSinCierre.map(usuario => `
          <div class="t-border t-rounded t-p-2 t-flex t-justify-between t-items-center">
            <div>
              <p class="t-font-medium t-text-sm">${usuario.nombreCompleto}</p>
              <p class="t-text-xs t-text-gray-600">${usuario.correo}</p>
            </div>
            <button onclick="cerrarPeriodoIndividual(${periodo.id}, ${usuario.id}, '${usuario.nombreCompleto}')" 
                    class="t-bg-orange-500 t-text-white t-px-2 t-py-1 t-rounded t-text-xs hover:t-bg-orange-600">
              Cerrar
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  document.getElementById('contenidoEstadoCierres').innerHTML = `
    <div class="t-mb-6">
      <h4 class="t-text-lg t-font-semibold t-mb-2">${periodo.descripcion}</h4>
      <p class="t-text-sm t-text-gray-600">Período del ${formatearFecha(periodo.fechaInicio)} al ${formatearFecha(periodo.fechaFin)}</p>
    </div>
    
    <div class="t-mb-6">
      <h5 class="t-text-md t-font-semibold t-mb-2 t-text-green-700">
        <i class="fas fa-lock t-mr-2"></i>Usuarios con período cerrado (${usuariosConCierre.length})
      </h5>
      ${htmlCerrados}
    </div>
    
    <div>
      <h5 class="t-text-md t-font-semibold t-mb-2 t-text-orange-700">
        <i class="fas fa-unlock t-mr-2"></i>Usuarios pendientes de cierre (${usuariosSinCierre.length})
      </h5>
      ${htmlPendientes}
    </div>
  `;
  
  document.getElementById('modalEstadoCierres').classList.remove('t-hidden');
  document.getElementById('modalEstadoCierres').classList.add('t-flex');
}

function cerrarModalCierres() {
  document.getElementById('modalEstadoCierres').classList.add('t-hidden');
  document.getElementById('modalEstadoCierres').classList.remove('t-flex');
}

async function abrirModalCerrar(periodoId) {
  try {
    const response = await fetch(`/periodos/api/${periodoId}/estado-cierres`);
    const data = await response.json();
    
    if (data.ok) {
      usuariosPendientes = data.usuariosSinCierre;
      document.getElementById('periodoIdCierre').value = periodoId;
      
      if (usuariosPendientes.length === 0) {
        mostrarAlerta('No hay usuarios pendientes de cierre para este período', 'info');
        return;
      }
      
      const listaHtml = usuariosPendientes.map(usuario => `
        <div class="t-flex t-items-center t-mb-2">
          <input type="checkbox" id="user_${usuario.id}" name="usuarios" value="${usuario.id}" 
                 class="t-mr-2" checked>
          <label for="user_${usuario.id}" class="t-text-sm">
            ${usuario.nombreCompleto} - ${usuario.correo}
          </label>
        </div>
      `).join('');
      
      document.getElementById('listaUsuariosCerrar').innerHTML = listaHtml;
      document.getElementById('modalCerrarPeriodo').classList.remove('t-hidden');
      document.getElementById('modalCerrarPeriodo').classList.add('t-flex');
    } else {
      mostrarAlerta('Error al cargar usuarios', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error de conexión', 'danger');
  }
}

function cerrarModalCerrar() {
  document.getElementById('modalCerrarPeriodo').classList.add('t-hidden');
  document.getElementById('modalCerrarPeriodo').classList.remove('t-flex');
}

async function ejecutarCierre() {
  const periodoId = document.getElementById('periodoIdCierre').value;
  const observaciones = document.getElementById('observacionesCierre').value;
  const checkboxes = document.querySelectorAll('input[name="usuarios"]:checked');
  
  if (checkboxes.length === 0) {
    mostrarAlerta('Seleccione al menos un usuario', 'warning');
    return;
  }
  
  const userIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
  
  try {
    const response = await fetch('/cierres/cerrar-multiple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ periodoId: parseInt(periodoId), userIds, observaciones })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModalCerrar();
      cargarPeriodos();
      
      if (data.resultados.fallidos.length > 0) {
        console.log('Cierres fallidos:', data.resultados.fallidos);
      }
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al cerrar períodos', 'danger');
  }
}

async function cerrarPeriodoIndividual(periodoId, userId, nombreUsuario) {
  if (!confirm(`¿Está seguro de cerrar el período para ${nombreUsuario}?`)) {
    return;
  }
  
  try {
    const response = await fetch('/cierres/cerrar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ periodoId, userId })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModalCierres();
      cargarPeriodos();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al cerrar período', 'danger');
  }
}

async function reabrirPeriodo(cierreId) {
  if (!confirm('¿Está seguro de reabrir este período? El usuario podrá volver a registrar movimientos.')) {
    return;
  }
  
  try {
    const response = await fetch(`/cierres/${cierreId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cerrarModalCierres();
      cargarPeriodos();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al reabrir período', 'danger');
  }
}

async function activarPeriodo(periodoId) {
  if (!confirm('¿Está seguro de activar este período como el actual?')) {
    return;
  }
  
  try {
    const response = await fetch(`/periodos/api/${periodoId}/activar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo: true })
    });
    
    const data = await response.json();
    
    if (data.ok) {
      mostrarAlerta(data.mensaje, 'success');
      cargarPeriodos();
      cargarPeriodoActual();
    } else {
      mostrarAlerta(data.mensaje, 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al activar período', 'danger');
  }
}

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
      <svg class="t-fill-current t-h-6 t-w-6" role="button" onclick="this.parentElement.parentElement.remove()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
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