async function cargarPedidos() {
  const contenedor = document.getElementById('lista-pedidos');
  const usuario = obtenerUsuario();
  if (!usuario) {
    contenedor.innerHTML = `
      <div class="tarjeta p-5 text-center">
        <p class="text-muted">Inicia sesión para consultar tus pedidos.</p>
        <a class="btn-negro mt-2" href="login.html">Iniciar sesión</a>
      </div>`;
    return;
  }

  try {
    const pedidos = await peticion('/ordenes');
    if (pedidos.length === 0) {
      contenedor.innerHTML = `
        <div class="tarjeta p-5 text-center">
          <i class="bi bi-box fs-1 text-muted"></i>
          <p class="text-muted mt-3 mb-3">Aún no tienes pedidos.</p>
          <a class="btn-negro" href="catalogo.html">Ver catálogo</a>
        </div>`;
      return;
    }

    contenedor.innerHTML = pedidos.map((pedido) => `
      <div class="tarjeta p-4 mb-3 d-flex flex-wrap align-items-center gap-3">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2">
            <strong>${pedido.folio_orden}</strong>
            <span class="estado-pastilla">${formatearEstado(pedido.estado)}</span>
          </div>
          <p class="small text-muted mb-0">
            ${new Date(pedido.fecha_orden).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div class="text-end">
          <div class="fw-bold">${formatearPrecio(pedido.total)}</div>
          <button type="button" class="btn-ghost btn-sm mt-1 ver-detalle" data-id="${pedido.id_orden}">
            Ver detalle
          </button>
        </div>
      </div>`).join('');

    document.querySelectorAll('.ver-detalle').forEach((boton) => {
      boton.addEventListener('click', async () => {
        try {
          const detalle = await peticion(`/ordenes/${boton.dataset.id}`);
          const articulos = detalle.articulos.map((a) => `
            <div class="d-flex justify-content-between py-1 border-bottom">
              <span>${a.nombre} &times; ${a.cantidad}</span>
              <span>${formatearPrecio(a.subtotal)}</span>
            </div>`).join('');
          mostrarAlerta('Detalle del pedido',
            `<strong>${detalle.folio_orden}</strong><br>
             <span class="estado-pastilla">${formatearEstado(detalle.estado)}</span>
             <div class="my-2">${articulos}</div>
             <div class="d-flex justify-content-between"><span>Subtotal</span><span>${formatearPrecio(detalle.subtotal)}</span></div>
             <div class="d-flex justify-content-between"><span>Envío</span><span>${formatearPrecio(detalle.envio)}</span></div>
             <div class="d-flex justify-content-between fw-bold"><span>Total</span><span>${formatearPrecio(detalle.total)}</span></div>
             <hr>
             <small class="text-muted">${detalle.calle} ${detalle.numero || ''}, ${detalle.colonia}, ${detalle.municipio}, ${detalle.estado}</small>`,
            'info');
        } catch (error) {
          mostrarAlerta('Error', error.message, 'error');
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', cargarPedidos);
