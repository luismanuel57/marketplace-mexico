const ENVIO_MXN = 199;

async function cargarBolsa() {
  const contenedor = document.getElementById('contenido-bolsa');
  const usuario = obtenerUsuario();
  if (!usuario) {
    contenedor.innerHTML = `
      <div class="tarjeta p-5 text-center">
        <i class="bi bi-bag fs-1 text-muted"></i>
        <p class="text-muted mt-3">Inicia sesión para ver tu bolsa.</p>
        <a class="btn-negro mt-2" href="login.html">Iniciar sesión</a>
      </div>`;
    return;
  }

  try {
    const bolsa = await peticion('/bolsa');
    if (bolsa.articulos.length === 0) {
      contenedor.innerHTML = `
        <div class="tarjeta p-5 text-center">
          <i class="bi bi-bag fs-1 text-muted"></i>
          <p class="text-muted mt-3 mb-3">Tu bolsa está vacía.</p>
          <a class="btn-negro" href="catalogo.html">Ver catálogo</a>
        </div>`;
      return;
    }

    const total = bolsa.subtotal + ENVIO_MXN;
    contenedor.innerHTML = `
      <div class="row g-4">
        <div class="col-lg-8">
          ${bolsa.articulos.map(renderizarLinea).join('')}
        </div>
        <div class="col-lg-4">
          <div class="tarjeta p-4">
            <h2 class="h6 mb-3 text-uppercase text-muted">Resumen</h2>
            <div class="d-flex justify-content-between mb-2">
              <span class="text-muted">Subtotal</span>
              <span>${formatearPrecio(bolsa.subtotal)}</span>
            </div>
            <div class="d-flex justify-content-between mb-3">
              <span class="text-muted">Envío</span>
              <span>${formatearPrecio(ENVIO_MXN)}</span>
            </div>
            <div class="d-flex justify-content-between border-top pt-3 mb-4">
              <strong>Total</strong>
              <strong>${formatearPrecio(total)}</strong>
            </div>
            <button type="button" class="btn-negro w-100" id="btn-ordenar">Generar pedido</button>
          </div>
        </div>
      </div>`;

    document.querySelectorAll('.btn-cantidad').forEach((boton) => {
      boton.addEventListener('click', () => {
        const idDetalle = Number(boton.dataset.id);
        const delta = Number(boton.dataset.delta);
        actualizarCantidad(idDetalle, delta);
      });
    });

    document.querySelectorAll('.btn-eliminar-linea').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const idDetalle = Number(boton.dataset.id);
        const confirmar = await mostrarConfirmacion('Eliminar artículo', '¿Quieres quitar este artículo de tu bolsa?');
        if (!confirmar) return;
        try {
          await peticion(`/bolsa/articulos/${idDetalle}`, { method: 'DELETE' });
          cargarBolsa();
        } catch (error) {
          mostrarAlerta('No se pudo eliminar', error.message, 'error');
        }
      });
    });

    document.getElementById('btn-ordenar').addEventListener('click', generarPedido);
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

function renderizarLinea(linea) {
  return `
    <div class="tarjeta p-3 mb-3">
      <div class="d-flex gap-3 align-items-center">
        <img src="${linea.imagen_url || 'https://placehold.co/120x120/f5f5f5/9a9a9a?text=TD'}"
             alt="${linea.nombre}" class="rounded" style="width:90px;height:90px;object-fit:cover;"
             onerror="this.onerror=null;this.src='https://placehold.co/120x120/f5f5f5/9a9a9a?text=TD';">
        <div class="flex-grow-1">
          <h3 class="h6 mb-1">${linea.nombre}</h3>
          <p class="small text-muted mb-2">${formatearPrecio(linea.precio_unitario)} c/u</p>
          <div class="d-flex align-items-center gap-2">
            <button type="button" class="btn-ghost btn-sm px-2 btn-cantidad"
              data-id="${linea.id_detalle}" data-delta="-1">−</button>
            <span class="px-2">${linea.cantidad}</span>
            <button type="button" class="btn-ghost btn-sm px-2 btn-cantidad"
              data-id="${linea.id_detalle}" data-delta="1">+</button>
          </div>
        </div>
        <div class="text-end">
          <div class="fw-bold mb-2">${formatearPrecio(linea.subtotal_linea)}</div>
          <button type="button" class="btn-ghost btn-sm px-3 btn-eliminar-linea" data-id="${linea.id_detalle}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}

async function actualizarCantidad(idDetalle, delta) {
  const usuario = obtenerUsuario();
  const bolsa = await peticion('/bolsa');
  const linea = bolsa.articulos.find((a) => a.id_detalle === idDetalle);
  if (!linea) return;
  const nueva = linea.cantidad + delta;
  if (nueva < 1) return;
  if (usuario && nueva > linea.existencias) {
    mostrarAlerta('Sin existencias', `Solo hay ${linea.existencias} disponibles de este producto.`, 'error');
    return;
  }
  try {
    await peticion(`/bolsa/articulos/${idDetalle}`, {
      method: 'PUT',
      body: JSON.stringify({ cantidad: nueva }),
    });
    cargarBolsa();
  } catch (error) {
    mostrarAlerta('No se pudo actualizar', error.message, 'error');
  }
}

async function generarPedido() {
  try {
    const domicilios = await peticion('/domicilios');
    if (domicilios.length === 0) {
      mostrarAlerta('Sin dirección', 'Agrega una dirección de envío antes de generar tu pedido.', 'info');
      return;
    }

    const opciones = domicilios
      .map((d) => `<button type="button" class="d-flex w-100 text-start btn-ghost mb-2 opcion-domicilio"
          data-id="${d.id_domicilio}">
        <span><strong>${d.nombre || 'Dirección'}</strong><br>
        <small class="text-muted">${d.calle} ${d.numero || ''}, ${d.colonia}, ${d.municipio}, ${d.estado}</small></span>
      </button>`)
      .join('');

    const overlay = crearModalSistema();
    const acciones = overlay.querySelector('.modal-sistema-acciones');
    overlay.querySelector('.modal-sistema-titulo').textContent = 'Elige la dirección de envío';
    overlay.querySelector('.modal-sistema-mensaje').innerHTML = opciones;
    acciones.innerHTML = '';
    overlay.classList.add('visible');

    overlay.querySelectorAll('.opcion-domicilio').forEach((boton) => {
      boton.addEventListener('click', async () => {
        overlay.classList.remove('visible');
        try {
          const resultado = await peticion('/ordenes', {
            method: 'POST',
            body: JSON.stringify({ id_domicilio: Number(boton.dataset.id) }),
          });
          mostrarAlerta('Pedido generado', `Tu pedido ${resultado.orden.folio_orden} fue creado con éxito.`, 'exito');
          setTimeout(() => { window.location.href = 'pedidos.html'; }, 1200);
        } catch (error) {
          mostrarAlerta('No se pudo generar', error.message, 'error');
        }
      });
    });
  } catch (error) {
    mostrarAlerta('No se pudo generar', error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', cargarBolsa);
