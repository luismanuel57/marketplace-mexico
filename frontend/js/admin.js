async function verificarAdmin() {
  const contenedor = document.getElementById('verificacion-admin');
  const usuario = obtenerUsuario();
  if (!usuario || usuario.rol !== 'administrador') {
    contenedor.innerHTML = `
      <div class="tarjeta p-5 text-center">
        <i class="bi bi-shield-lock fs-1 text-muted"></i>
        <p class="text-muted mt-3">Esta sección es solo para administradores.</p>
        <a class="btn-negro mt-2" href="login.html">Iniciar sesión</a>
      </div>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="d-flex gap-2 mb-4">
      <button type="button" class="pestana-auth activa" data-vista="vista-articulos">Artículos</button>
      <button type="button" class="pestana-auth" data-vista="vista-pedidos">Pedidos</button>
      <button type="button" class="pestana-auth" data-vista="vista-clientes">Clientes</button>
    </div>
    <div id="vista-articulos"></div>
    <div id="vista-pedidos" class="d-none"></div>
    <div id="vista-clientes" class="d-none"></div>`;

  document.querySelectorAll('#verificacion-admin .pestana-auth').forEach((pestana) => {
    pestana.addEventListener('click', () => {
      document.querySelectorAll('#verificacion-admin .pestana-auth').forEach((p) => p.classList.remove('activa'));
      pestana.classList.add('activa');
      document.querySelectorAll('#verificacion-admin [data-vista]').forEach((v) => {
        if (v.tagName === 'DIV') v.classList.add('d-none');
      });
      document.getElementById(pestana.dataset.vista).classList.remove('d-none');
    });
  });

  await Promise.all([cargarArticulosAdmin(), cargarPedidosAdmin(), cargarClientesAdmin()]);
}

async function cargarArticulosAdmin() {
  const contenedor = document.getElementById('vista-articulos');
  try {
    const articulos = await peticion('/articulos');
    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0">Artículos</h2>
        <button type="button" class="btn-negro btn-sm" id="btn-nuevo-articulo">+ Nuevo artículo</button>
      </div>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Estatus</th><th></th></tr>
            </thead>
            <tbody>
              ${articulos.map((a) => `
                <tr>
                  <td>${a.id_articulo}</td>
                  <td>${a.nombre}</td>
                  <td>${a.categoria}</td>
                  <td>${formatearPrecio(a.precio_mxn)}</td>
                  <td>${a.existencias}</td>
                  <td><span class="estado-pastilla">${a.estatus}</span></td>
                  <td>
                    ${a.estatus === 'activo'
                      ? `<button type="button" class="btn-ghost btn-sm desactivar-articulo" data-id="${a.id_articulo}">Desactivar</button>`
                      : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-nuevo-articulo').addEventListener('click', mostrarFormularioArticulo);
    document.querySelectorAll('.desactivar-articulo').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const confirmar = await mostrarConfirmacion('Desactivar artículo', 'El artículo dejará de estar visible. ¿Continuar?');
        if (!confirmar) return;
        try {
          await peticion(`/articulos/${boton.dataset.id}`, { method: 'DELETE' });
          mostrarAlerta('Artículo desactivado', 'El artículo se desactivó correctamente.', 'exito');
          cargarArticulosAdmin();
        } catch (error) {
          mostrarAlerta('No se pudo desactivar', error.message, 'error');
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

async function mostrarFormularioArticulo() {
  const overlay = crearModalSistema();
  const categorias = await peticion('/categorias');
  const opciones = categorias.map((c) => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');

  overlay.querySelector('.modal-sistema-titulo').textContent = 'Nuevo artículo';
  overlay.querySelector('.modal-sistema-mensaje').innerHTML = `
    <div class="campo-form mb-2">
      <label>Nombre *</label>
      <input type="text" class="form-control" id="art-nombre">
    </div>
    <div class="campo-form mb-2">
      <label>Descripción</label>
      <textarea class="form-control" id="art-descripcion" rows="2"></textarea>
    </div>
    <div class="campo-form mb-2">
      <label>Categoría *</label>
      <select class="form-select" id="art-categoria">${opciones}</select>
    </div>
    <div class="campo-form mb-2">
      <label>Precio (MXN) *</label>
      <input type="number" class="form-control" id="art-precio" min="0" step="0.01">
    </div>
    <div class="campo-form mb-2">
      <label>Existencias</label>
      <input type="number" class="form-control" id="art-existencias" min="0">
    </div>
    <div class="campo-form mb-2">
      <label>Marca</label>
      <input type="text" class="form-control" id="art-marca">
    </div>
    <div class="campo-form mb-2">
      <label>Imagen (URL)</label>
      <input type="text" class="form-control" id="art-imagen">
    </div>`;
  overlay.querySelector('.modal-sistema-acciones').innerHTML = `
    <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
    <button type="button" class="btn-negro btn-sm px-4 modal-guardar">Guardar</button>`;
  overlay.classList.add('visible');

  overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));
  overlay.querySelector('.modal-guardar').addEventListener('click', async () => {
    const cuerpo = {
      nombre: document.getElementById('art-nombre').value.trim(),
      descripcion: document.getElementById('art-descripcion').value.trim() || null,
      id_categoria: Number(document.getElementById('art-categoria').value),
      precio_mxn: Number(document.getElementById('art-precio').value),
      existencias: Number(document.getElementById('art-existencias').value) || 0,
      marca: document.getElementById('art-marca').value.trim() || null,
      imagen_url: document.getElementById('art-imagen').value.trim() || null,
    };
    if (!cuerpo.nombre || !cuerpo.id_categoria || isNaN(cuerpo.precio_mxn)) {
      mostrarAlerta('Datos incompletos', 'Nombre, categoría y precio son obligatorios.', 'error');
      return;
    }
    try {
      await peticion('/articulos', { method: 'POST', body: JSON.stringify(cuerpo) });
      overlay.classList.remove('visible');
      mostrarAlerta('Artículo creado', 'El artículo se publicó correctamente.', 'exito');
      cargarArticulosAdmin();
    } catch (error) {
      mostrarAlerta('No se pudo crear', error.message, 'error');
    }
  });
}

async function cargarPedidosAdmin() {
  const contenedor = document.getElementById('vista-pedidos');
  try {
    const pedidos = await peticion('/ordenes/todas');
    const estados = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
    contenedor.innerHTML = `
      <h2 class="h5 mb-3">Pedidos</h2>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              ${pedidos.map((p) => `
                <tr>
                  <td>${p.folio_orden}</td>
                  <td>${p.cliente}</td>
                  <td>${new Date(p.fecha_orden).toLocaleDateString('es-MX')}</td>
                  <td>${formatearPrecio(p.total)}</td>
                  <td><span class="estado-pastilla">${formatearEstado(p.estado)}</span></td>
                  <td>
                    <select class="form-select form-select-sm cambiar-estado" data-id="${p.id_orden}" style="width:auto;">
                      ${estados.map((e) => `<option value="${e}" ${e === p.estado ? 'selected' : ''}>${formatearEstado(e)}</option>`).join('')}
                    </select>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.querySelectorAll('.cambiar-estado').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await peticion(`/ordenes/${select.dataset.id}/estado`, {
            method: 'PUT',
            body: JSON.stringify({ estado: select.value }),
          });
          mostrarAlerta('Estado actualizado', 'El estado del pedido se actualizó.', 'exito');
        } catch (error) {
          mostrarAlerta('No se pudo actualizar', error.message, 'error');
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

async function cargarClientesAdmin() {
  const contenedor = document.getElementById('vista-clientes');
  try {
    const clientes = await peticion('/clientes');
    contenedor.innerHTML = `
      <h2 class="h5 mb-3">Clientes</h2>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th></tr>
            </thead>
            <tbody>
              ${clientes.map((c) => `
                <tr>
                  <td>${c.id_cliente}</td>
                  <td>${c.nombre} ${c.apellido_paterno || ''}</td>
                  <td>${c.correo}</td>
                  <td>${c.telefono || '—'}</td>
                  <td><span class="estado-pastilla">${c.rol || 'cliente'}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', verificarAdmin);
