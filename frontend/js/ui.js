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

function mostrarConfirmacion(titulo, mensaje) {
  return new Promise((resolver) => {
    modalResolucion = resolver;
    const overlay = configurarModal('info', titulo, mensaje);
    const acciones = overlay.querySelector('.modal-sistema-acciones');
    acciones.innerHTML = `
      <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
      <button type="button" class="btn-negro btn-sm px-4 modal-confirmar">Confirmar</button>`;
    overlay.querySelector('.modal-cancelar').addEventListener('click', cerrarModal);
    overlay.querySelector('.modal-confirmar').addEventListener('click', () => {
      overlay.classList.remove('visible');
      resolver(true);
    });
    abrirModal();
  });
}
