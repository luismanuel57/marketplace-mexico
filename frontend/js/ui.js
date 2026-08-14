// Escapa caracteres HTML para inyectar texto de la API sin romper el DOM.
// Se define aquí porque ui.js se carga en todas las páginas: así cualquier
// script que pinte datos de la API usa esta única implementación en vez de
// duplicarla localmente.
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let modalResolucion = null;

function crearModalSistema() {
  const existente = document.getElementById('modal-sistema');
  if (existente) return existente;
  const contenedor = document.createElement('div');
  contenedor.id = 'modal-sistema';
  contenedor.className = 'modal-sistema-overlay';
  contenedor.innerHTML = `
    <div class="modal-sistema" role="dialog" aria-modal="true">
      <div class="modal-sistema-icone info"><i class="bi bi-info-lg"></i></div>
      <h2 class="modal-sistema-titulo"></h2>
      <p class="modal-sistema-mensaje"></p>
      <div class="d-flex justify-content-end gap-2 modal-sistema-acciones"></div>
    </div>`;
  document.body.appendChild(contenedor);
  return contenedor;
}

function configurarModal(tipo, titulo, mensaje, esHtml = false) {
  const overlay = crearModalSistema();
  const icone = overlay.querySelector('.modal-sistema-icone');
  icone.className = 'modal-sistema-icone ' + tipo;
  icone.innerHTML =
    tipo === 'exito' ? '<i class="bi bi-check-lg"></i>' :
    tipo === 'error' ? '<i class="bi bi-x-lg"></i>' :
    '<i class="bi bi-info-lg"></i>';
  overlay.querySelector('.modal-sistema-titulo').textContent = titulo;
  const cuerpo = overlay.querySelector('.modal-sistema-mensaje');
  if (esHtml) cuerpo.innerHTML = mensaje;
  else cuerpo.textContent = mensaje;
  return overlay;
}

function abrirModal() {
  const overlay = crearModalSistema();
  overlay.classList.add('visible');
}

function cerrarModal() {
  const overlay = crearModalSistema();
  overlay.classList.remove('visible');
  if (modalResolucion) {
    modalResolucion(false);
    modalResolucion = null;
  }
}

async function mostrarAlerta(titulo, mensaje, tipo = 'info', esHtml = false) {
  const overlay = configurarModal(tipo, titulo, mensaje, esHtml);
  const acciones = overlay.querySelector('.modal-sistema-acciones');
  acciones.innerHTML = '<button type="button" class="btn-negro btn-sm px-4 modal-cerrar">Aceptar</button>';
  overlay.querySelector('.modal-cerrar').addEventListener('click', cerrarModal);
  abrirModal();
}

// Clase de color para las pastillas de estado (pedidos y artículos).
function claseEstado(estado) {
  const clases = {
    pendiente: 'estado-advertencia',
    confirmado: 'estado-info',
    preparando: 'estado-info',
    enviado: 'estado-info',
    entregado: 'estado-exito',
    cancelado: 'estado-error',
    activo: 'estado-exito',
    inactivo: 'estado-error',
  };
  return clases[estado] || '';
}

// Icono de Bootstrap Icons asociado al estado.
function iconoEstado(estado) {
  const iconos = {
    pendiente: 'bi-clock-history',
    confirmado: 'bi-check2-circle',
    preparando: 'bi-hourglass-split',
    enviado: 'bi-truck',
    entregado: 'bi-house-check',
    cancelado: 'bi-x-circle',
    activo: 'bi-check2-circle',
    inactivo: 'bi-x-circle',
  };
  return iconos[estado] || 'bi-circle';
}

function mostrarConfirmacion(titulo, mensaje, textoConfirmar = 'Confirmar') {
  return new Promise((resolver) => {
    modalResolucion = resolver;
    const overlay = configurarModal('info', titulo, mensaje);
    const acciones = overlay.querySelector('.modal-sistema-acciones');
    acciones.innerHTML = `
      <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
      <button type="button" class="btn-negro btn-sm px-4 modal-confirmar">${textoConfirmar}</button>`;
    overlay.querySelector('.modal-cancelar').addEventListener('click', cerrarModal);
    overlay.querySelector('.modal-confirmar').addEventListener('click', () => {
      overlay.classList.remove('visible');
      resolver(true);
    });
    abrirModal();
  });
}
