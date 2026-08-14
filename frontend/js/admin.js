const vistasCargadas = {};

async function verificarAdmin() {
  const contenedor = document.getElementById('verificacion-admin');
  const usuario = obtenerUsuario();
  if (!usuario || usuario.rol !== 'administrador') {
    contenedor.innerHTML = `
      <div class="tarjeta p-5 text-center">
        <i class="bi bi-shield-lock fs-1 text-muted"></i>
        <p class="text-muted mt-3">Esta sección es solo para administradores.</p>
        <a class="btn-negro mt-2" href="login.html"><i class="bi bi-box-arrow-in-right me-1"></i>Iniciar sesión</a>
      </div>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="d-flex gap-2 mb-4 flex-wrap">
      <button type="button" class="pestana-auth activa" data-vista="vista-articulos"><i class="bi bi-box-seam me-1"></i>Artículos</button>
      <button type="button" class="pestana-auth" data-vista="vista-categorias"><i class="bi bi-tags me-1"></i>Categorías</button>
      <button type="button" class="pestana-auth" data-vista="vista-pedidos"><i class="bi bi-receipt me-1"></i>Pedidos</button>
      <button type="button" class="pestana-auth" data-vista="vista-clientes"><i class="bi bi-people me-1"></i>Clientes</button>
      <button type="button" class="pestana-auth" data-vista="vista-vendedores"><i class="bi bi-shop me-1"></i>Vendedores</button>
      <button type="button" class="pestana-auth" data-vista="vista-bitacora"><i class="bi bi-journal-text me-1"></i>Bitácora</button>
    </div>
    <div id="vista-articulos"></div>
    <div id="vista-categorias" class="d-none"></div>
    <div id="vista-pedidos" class="d-none"></div>
    <div id="vista-clientes" class="d-none"></div>
    <div id="vista-vendedores" class="d-none"></div>
    <div id="vista-bitacora" class="d-none"></div>`;

  const cargarVista = {
    'vista-articulos': cargarArticulosAdmin,
    'vista-categorias': cargarCategoriasAdmin,
    'vista-pedidos': cargarPedidosAdmin,
    'vista-clientes': cargarClientesAdmin,
    'vista-vendedores': cargarVendedoresAdmin,
    'vista-bitacora': cargarBitacoraAdmin,
  };

  document.querySelectorAll('#verificacion-admin .pestana-auth').forEach((pestana) => {
    pestana.addEventListener('click', () => {
      document.querySelectorAll('#verificacion-admin .pestana-auth').forEach((p) => p.classList.remove('activa'));
      pestana.classList.add('activa');
      const vistaId = pestana.dataset.vista;
      Object.keys(cargarVista).forEach((id) => document.getElementById(id).classList.add('d-none'));
      document.getElementById(vistaId).classList.remove('d-none');
      if (!vistasCargadas[vistaId]) {
        vistasCargadas[vistaId] = true;
        cargarVista[vistaId]();
      }
    });
  });

  cargarArticulosAdmin();
}

async function cargarArticulosAdmin() {
  const contenedor = document.getElementById('vista-articulos');
  try {
    const articulos = await peticion('/articulos');
    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0"><i class="bi bi-box-seam icono-acento me-1"></i>Artículos</h2>
        <button type="button" class="btn-negro btn-sm" id="btn-nuevo-articulo"><i class="bi bi-plus-circle me-1"></i>Nuevo artículo</button>
      </div>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>ID</th><th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Estatus</th><th>Destacado</th><th></th></tr>
            </thead>
            <tbody>
              ${articulos.map((a) => `
                <tr>
                  <td>${a.id_articulo}</td>
                  <td>
                    <img src="${a.imagen_url || 'https://placehold.co/40x40/f5f5f5/9a9a9a?text=?'}"
                         alt="${esc(a.nombre)}" class="rounded"
                         style="width:40px;height:40px;object-fit:cover;"
                         onerror="this.onerror=null;this.src='https://placehold.co/40x40/f5f5f5/9a9a9a?text=?';">
                  </td>
                  <td>${esc(a.nombre)}</td>
                  <td>${esc(a.categoria)}</td>
                  <td>${formatearPrecio(a.precio_mxn)}</td>
                  <td>${a.existencias}</td>
                  <td><span class="estado-pastilla ${claseEstado(a.estatus)}"><i class="bi ${iconoEstado(a.estatus)} me-1"></i>${a.estatus}</span></td>
                  <td>
                    <span class="estado-pastilla ${a.destacado ? 'destacado-si' : ''}"><i class="bi ${a.destacado ? 'bi-star-fill' : 'bi-star'} me-1"></i>${a.destacado ? 'Sí' : 'No'}</span>
                    <button type="button" class="btn-ghost btn-sm ms-1 destacar-articulo" data-id="${a.id_articulo}" data-destacado="${a.destacado}">
                      <i class="bi ${a.destacado ? 'bi-star' : 'bi-star-fill'} me-1"></i>${a.destacado ? 'Quitar' : 'Destacar'}
                    </button>
                  </td>
                  <td>
                    <button type="button" class="btn-ghost btn-sm editar-articulo" data-id="${a.id_articulo}"><i class="bi bi-pencil-square me-1"></i>Editar</button>
                    ${a.estatus === 'activo'
                      ? `<button type="button" class="btn-ghost btn-sm desactivar-articulo" data-id="${a.id_articulo}"><i class="bi bi-toggle-off me-1"></i>Desactivar</button>`
                      : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-nuevo-articulo').addEventListener('click', () => mostrarFormularioArticulo());
    document.querySelectorAll('.editar-articulo').forEach((boton) => {
      boton.addEventListener('click', () => {
        const art = articulos.find((a) => a.id_articulo === Number(boton.dataset.id));
        if (!art) return;
        mostrarFormularioArticulo(art);
      });
    });
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
    document.querySelectorAll('.destacar-articulo').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const destacar = boton.dataset.destacado !== 'true';
        try {
          await peticion(`/articulos/${boton.dataset.id}/destacado`, {
            method: 'PUT',
            body: JSON.stringify({ destacado: destacar }),
          });
          mostrarAlerta('Destacado actualizado', destacar
            ? 'El artículo se mostrará en la portada.'
            : 'El artículo ya no se muestra en la portada.', 'exito');
          cargarArticulosAdmin();
        } catch (error) {
          mostrarAlerta('No se pudo actualizar', error.message, 'error');
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

async function mostrarFormularioArticulo(articulo = null) {
  const overlay = crearModalSistema();
  const esEdicion = !!articulo;
  const datos = articulo || {};
  let categorias;
  try {
    categorias = await peticion('/categorias');
  } catch (error) {
    mostrarAlerta('Error', error.message, 'error');
    return;
  }
  const opciones = categorias
    .map((c) => `<option value="${c.id_categoria}" ${c.id_categoria === datos.id_categoria ? 'selected' : ''}>${esc(c.nombre)}</option>`)
    .join('');

  // Si se edita un artículo cuya categoría fue desactivada, la lista de activas
  // no la incluye: el navegador reasignaría el artículo a la primera opción en
  // silencio. Se agrega la categoría del artículo marcada como (inactiva) para
  // conservar la selección y avisar al administrador.
  let opcionesFinal = opciones;
  if (esEdicion && datos.id_categoria && !categorias.some((c) => c.id_categoria === datos.id_categoria)) {
    if (datos.categoria) {
      opcionesFinal += `<option value="${datos.id_categoria}" selected>${esc(datos.categoria)} (inactiva)</option>`;
    }
  }

  overlay.querySelector('.modal-sistema-titulo').textContent = esEdicion ? 'Editar artículo' : 'Nuevo artículo';
  overlay.querySelector('.modal-sistema-mensaje').innerHTML = `
    <div class="campo-form mb-2">
      <label>Nombre *</label>
      <input type="text" class="form-control" id="art-nombre" value="${esc(datos.nombre)}">
    </div>
    <div class="campo-form mb-2">
      <label>Descripción</label>
      <textarea class="form-control" id="art-descripcion" rows="2">${esc(datos.descripcion)}</textarea>
    </div>
    <div class="campo-form mb-2">
      <label>Categoría *</label>
      <select class="form-select" id="art-categoria">${opcionesFinal}</select>
    </div>
    <div class="campo-form mb-2">
      <label>Precio (MXN) *</label>
      <input type="number" class="form-control" id="art-precio" min="0" step="0.01" value="${esc(datos.precio_mxn)}">
    </div>
    <div class="campo-form mb-2">
      <label>Existencias</label>
      <input type="number" class="form-control" id="art-existencias" min="0" value="${esc(datos.existencias)}">
    </div>
    <div class="campo-form mb-2">
      <label>Marca</label>
      <input type="text" class="form-control" id="art-marca" value="${esc(datos.marca)}">
    </div>
    <div class="campo-form mb-2">
      <label>Imagen del producto</label>
      <input type="file" class="d-none" id="art-imagen-input" accept="image/jpeg,image/png,image/webp,image/gif">
      <div class="d-flex align-items-center gap-3">
        <button type="button" class="btn-ghost btn-sm" id="btn-seleccionar-imagen">
          <i class="bi bi-image me-1"></i>Seleccionar imagen
        </button>
        <img id="art-imagen-preview" class="d-none" alt="Vista previa"
             style="width:64px;height:64px;object-fit:cover;border:1px solid var(--borde);">
      </div>
      <div class="small text-muted mt-1">La imagen se sube a Google Drive y su URL se guarda con el producto.</div>
    </div>`;
  overlay.querySelector('.modal-sistema-acciones').innerHTML = `
    <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
    <button type="button" class="btn-negro btn-sm px-4 modal-guardar"><i class="bi bi-check-lg me-1"></i>Guardar</button>`;
  if (datos.imagen_url) {
    const preview = overlay.querySelector('#art-imagen-preview');
    preview.src = datos.imagen_url;
    preview.classList.remove('d-none');
  }
  overlay.classList.add('visible');

  overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));
  overlay.querySelector('.modal-guardar').addEventListener('click', async () => {
    const cuerpo = {
      nombre: document.getElementById('art-nombre').value.trim(),
      descripcion: document.getElementById('art-descripcion').value.trim(),
      id_categoria: Number(document.getElementById('art-categoria').value),
      precio_mxn: Number(document.getElementById('art-precio').value),
      existencias: Number(document.getElementById('art-existencias').value) || 0,
      marca: document.getElementById('art-marca').value.trim(),
      imagen_url: esEdicion ? (articulo.imagen_url ?? null) : null,
    };
    if (!cuerpo.nombre || !cuerpo.id_categoria || isNaN(cuerpo.precio_mxn)) {
      mostrarAlerta('Datos incompletos', 'Nombre, categoría y precio son obligatorios.', 'error');
      return;
    }
    const archivo = document.getElementById('art-imagen-input').files[0];
    const botonGuardar = overlay.querySelector('.modal-guardar');
    try {
      if (archivo) {
        const nombreCategoria = document.getElementById('art-categoria').selectedOptions[0]?.text || 'Otros';
        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Subiendo imagen...';
        const subida = await subirImagenDrive(archivo, nombreCategoria);
        cuerpo.imagen_url = subida.imagen_url;
      }
      if (esEdicion) {
        await peticion(`/articulos/${articulo.id_articulo}`, { method: 'PUT', body: JSON.stringify(cuerpo) });
      } else {
        await peticion('/articulos', { method: 'POST', body: JSON.stringify(cuerpo) });
      }
      overlay.classList.remove('visible');
      mostrarAlerta(esEdicion ? 'Artículo actualizado' : 'Artículo creado', esEdicion ? 'Los cambios se guardaron correctamente.' : 'El artículo se publicó correctamente.', 'exito');
      cargarArticulosAdmin();
    } catch (error) {
      botonGuardar.disabled = false;
      botonGuardar.textContent = 'Guardar';
      mostrarAlerta(esEdicion ? 'No se pudo actualizar' : 'No se pudo crear', error.message, 'error');
    }
  });

  const inputImagen = overlay.querySelector('#art-imagen-input');
  overlay.querySelector('#btn-seleccionar-imagen').addEventListener('click', () => inputImagen.click());
  inputImagen.addEventListener('change', () => {
    const archivo = inputImagen.files[0];
    const preview = overlay.querySelector('#art-imagen-preview');
    if (archivo) {
      preview.src = URL.createObjectURL(archivo);
      preview.classList.remove('d-none');
    } else {
      preview.classList.add('d-none');
    }
  });
}

async function cargarCategoriasAdmin() {
  const contenedor = document.getElementById('vista-categorias');
  try {
    const categorias = await peticion('/categorias/todas');
    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0"><i class="bi bi-tags icono-acento me-1"></i>Categorías</h2>
        <button type="button" class="btn-negro btn-sm" id="btn-nueva-categoria"><i class="bi bi-plus-circle me-1"></i>Nueva categoría</button>
      </div>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Estatus</th><th>Fecha de creación</th><th></th></tr>
            </thead>
            <tbody>
              ${categorias.map((c) => `
                <tr>
                  <td>${c.id_categoria}</td>
                  <td>${esc(c.nombre)}</td>
                  <td>${esc(c.descripcion) || '—'}</td>
                  <td><span class="estado-pastilla ${c.estatus === 'activo' ? 'estado-exito' : ''}"><i class="bi ${iconoEstado(c.estatus)} me-1"></i>${c.estatus}</span></td>
                  <td>${new Date(c.fecha_creacion).toLocaleDateString('es-MX')}</td>
                  <td>
                    <button type="button" class="btn-ghost btn-sm editar-categoria" data-id="${c.id_categoria}"><i class="bi bi-pencil-square me-1"></i>Editar</button>
                    ${c.estatus === 'activo'
                      ? `<button type="button" class="btn-ghost btn-sm cambiar-estatus-categoria" data-id="${c.id_categoria}" data-estatus="inactivo"><i class="bi bi-toggle-off me-1"></i>Desactivar</button>`
                      : `<button type="button" class="btn-ghost btn-sm cambiar-estatus-categoria" data-id="${c.id_categoria}" data-estatus="activo"><i class="bi bi-toggle-on me-1"></i>Activar</button>`}
                    <button type="button" class="btn-ghost btn-sm eliminar-categoria" data-id="${c.id_categoria}"><i class="bi bi-trash me-1"></i>Eliminar</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btn-nueva-categoria').addEventListener('click', () => mostrarFormularioCategoria());
    document.querySelectorAll('.editar-categoria').forEach((boton) => {
      boton.addEventListener('click', () => {
        const cat = categorias.find((c) => c.id_categoria === Number(boton.dataset.id));
        if (!cat) return;
        mostrarFormularioCategoria(cat);
      });
    });
    document.querySelectorAll('.cambiar-estatus-categoria').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const nuevoEstatus = boton.dataset.estatus;
        const activar = nuevoEstatus === 'activo';
        if (!activar) {
          const confirmar = await mostrarConfirmacion('Desactivar categoría', 'La categoría dejará de aparecer en el catálogo y en el formulario de artículos. ¿Continuar?');
          if (!confirmar) return;
        }
        try {
          await peticion(`/categorias/${boton.dataset.id}/estatus`, {
            method: 'PATCH',
            body: JSON.stringify({ estatus: nuevoEstatus }),
          });
          mostrarAlerta(activar ? 'Categoría activada' : 'Categoría desactivada', activar ? 'La categoría volvió a estar disponible.' : 'La categoría ya no está disponible.', 'exito');
          cargarCategoriasAdmin();
          refrescarSelectCategorias();
        } catch (error) {
          mostrarAlerta('No se pudo cambiar el estatus', error.message, 'error');
        }
      });
    });
    document.querySelectorAll('.eliminar-categoria').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const confirmar = await mostrarConfirmacion('Eliminar categoría', 'La categoría se eliminará de forma permanente. Esta acción no se puede deshacer.', 'Eliminar');
        if (!confirmar) return;
        try {
          await peticion(`/categorias/${boton.dataset.id}`, { method: 'DELETE' });
          mostrarAlerta('Categoría eliminada', 'La categoría se eliminó correctamente.', 'exito');
          cargarCategoriasAdmin();
          refrescarSelectCategorias();
        } catch (error) {
          mostrarAlerta('No se pudo eliminar', error.message, 'error');
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

// avisoError: mensaje opcional que se pinta dentro del formulario cuando se
// reabre tras un fallo, para que el usuario sepa por qué no se guardó.
async function mostrarFormularioCategoria(categoria = null, avisoError = null) {
  const overlay = crearModalSistema();
  const esEdicion = !!categoria;
  const datos = categoria || {};

  overlay.querySelector('.modal-sistema-titulo').textContent = esEdicion ? 'Editar categoría' : 'Nueva categoría';
  overlay.querySelector('.modal-sistema-mensaje').innerHTML = `
    ${avisoError ? `<p class="text-danger small mb-2"><i class="bi bi-exclamation-triangle me-1"></i>${esc(avisoError)}</p>` : ''}
    <div class="campo-form mb-2">
      <label>Nombre *</label>
      <input type="text" class="form-control" id="cat-nombre" maxlength="60" value="${esc(datos.nombre)}">
    </div>
    <div class="campo-form mb-2">
      <label>Descripción</label>
      <textarea class="form-control" id="cat-descripcion" rows="2" maxlength="200">${esc(datos.descripcion)}</textarea>
    </div>`;
  overlay.querySelector('.modal-sistema-acciones').innerHTML = `
    <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
    <button type="button" class="btn-negro btn-sm px-4 modal-guardar"><i class="bi bi-check-lg me-1"></i>Guardar</button>`;
  overlay.classList.add('visible');

  overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));
  overlay.querySelector('.modal-guardar').addEventListener('click', async () => {
    const nombre = document.getElementById('cat-nombre').value.trim();
    const descripcion = document.getElementById('cat-descripcion').value.trim();
    if (!nombre) {
      mostrarAlerta('Datos incompletos', 'El nombre de la categoría es obligatorio.', 'error');
      return;
    }
    const botonGuardar = overlay.querySelector('.modal-guardar');
    try {
      botonGuardar.disabled = true;
      if (esEdicion) {
        await peticion(`/categorias/${categoria.id_categoria}`, { method: 'PUT', body: JSON.stringify({ nombre, descripcion }) });
      } else {
        await peticion('/categorias', { method: 'POST', body: JSON.stringify({ nombre, descripcion }) });
      }
      overlay.classList.remove('visible');
      mostrarAlerta(esEdicion ? 'Categoría actualizada' : 'Categoría creada', esEdicion ? 'Los cambios se guardaron correctamente.' : 'La categoría se creó correctamente.', 'exito');
      cargarCategoriasAdmin();
      refrescarSelectCategorias();
    } catch (error) {
      botonGuardar.disabled = false;
      // El modal es singleton y el alert sobrescribiría el formulario: se captura
      // lo escrito y se reabre el formulario con esos valores para no perderlos.
      overlay.classList.remove('visible');
      mostrarAlerta(esEdicion ? 'No se pudo actualizar' : 'No se pudo crear', error.message, 'error');
      mostrarFormularioCategoria({ ...datos, nombre, descripcion }, error.message);
    }
  });
}

// Actualiza el select de categorías del formulario de artículos si está abierto,
// para que no quede obsoleto tras crear, editar, activar, desactivar o eliminar.
async function refrescarSelectCategorias() {
  const select = document.getElementById('art-categoria');
  if (!select) return;
  try {
    const categorias = await peticion('/categorias');
    const seleccion = select.value;
    select.innerHTML = categorias
      .map((c) => `<option value="${c.id_categoria}">${esc(c.nombre)}</option>`)
      .join('');
    if (seleccion) {
      select.value = seleccion;
      // La categoría seleccionada ya no está entre las activas (se desactivó):
      // se re-agrega marcada como (inactiva) para no reasignar el artículo en
      // silencio a la primera opción.
      if (select.value !== seleccion) {
        const todas = await peticion('/categorias/todas');
        const desactivada = todas.find((c) => c.id_categoria === Number(seleccion));
        if (desactivada) {
          select.insertAdjacentHTML('beforeend',
            `<option value="${desactivada.id_categoria}" selected>${esc(desactivada.nombre)} (inactiva)</option>`);
        }
      }
    }
  } catch {
    // Si falla la actualización, el select conserva los datos anteriores.
  }
}

async function cargarPedidosAdmin() {
  const contenedor = document.getElementById('vista-pedidos');
  try {
    const pedidos = await peticion('/ordenes/todas');
    const estados = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
    contenedor.innerHTML = `
      <h2 class="h5 mb-3"><i class="bi bi-receipt icono-acento me-1"></i>Pedidos</h2>
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
                  <td><span class="estado-pastilla ${claseEstado(p.estado)}"><i class="bi ${iconoEstado(p.estado)} me-1"></i>${formatearEstado(p.estado)}</span></td>
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
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0"><i class="bi bi-people icono-acento me-1"></i>Clientes</h2>
        <button type="button" class="btn-negro btn-sm" id="btn-crear-cuenta"><i class="bi bi-person-plus me-1"></i>Crear cuenta</button>
      </div>
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

    document.getElementById('btn-crear-cuenta').addEventListener('click', mostrarModalCrearCuenta);
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

function marcarCampoAdmin(input, valido, mensaje) {
  input.classList.toggle('invalido', !valido);
  const contenedor = input.closest('.campo-form')?.querySelector('.mensaje-error');
  if (!contenedor) return valido;
  if (mensaje !== undefined) contenedor.textContent = mensaje;
  contenedor.classList.toggle('visible', !valido);
  return valido;
}

function mostrarModalCrearCuenta() {
  const overlay = crearModalSistema();

  overlay.querySelector('.modal-sistema-titulo').textContent = 'Crear cuenta';
  overlay.querySelector('.modal-sistema-mensaje').innerHTML = `
    <div class="campo-form mb-2">
      <label>Nombre *</label>
      <input type="text" class="form-control" id="cue-nombre" maxlength="40">
      <p class="mensaje-error">Campo obligatorio.</p>
    </div>
    <div class="campo-form mb-2">
      <label>Apellido paterno *</label>
      <input type="text" class="form-control" id="cue-apellido" maxlength="40">
      <p class="mensaje-error">Campo obligatorio.</p>
    </div>
    <div class="campo-form mb-2">
      <label>Apellido materno</label>
      <input type="text" class="form-control" id="cue-apellido-materno" maxlength="40">
      <p class="mensaje-error">Solo letras, espacios y guiones (máximo 40 caracteres).</p>
    </div>
    <div class="campo-form mb-2">
      <label>Correo electrónico *</label>
      <input type="email" class="form-control" id="cue-correo" placeholder="correo@ejemplo.mx">
      <p class="mensaje-error">Correo electrónico inválido.</p>
    </div>
    <div class="campo-form mb-2">
      <label>Teléfono</label>
      <input type="tel" class="form-control" id="cue-telefono" inputmode="numeric" maxlength="10" placeholder="3334567890">
      <p class="mensaje-error">El teléfono debe tener 10 dígitos (solo números).</p>
    </div>
    <div class="campo-form mb-2">
      <label>Contraseña *</label>
      <input type="password" class="form-control" id="cue-contrasena" placeholder="Mínimo 6 caracteres">
      <p class="mensaje-error">Debe tener al menos 6 caracteres.</p>
    </div>
    <div class="campo-form mb-2">
      <label>Tipo de cuenta</label>
      <select class="form-select" id="cue-rol">
        <option value="cliente" selected>Comprador</option>
        <option value="vendedor">Vendedor</option>
      </select>
    </div>`;
  overlay.querySelector('.modal-sistema-acciones').innerHTML = `
    <button type="button" class="btn-ghost btn-sm px-4 modal-cancelar">Cancelar</button>
    <button type="button" class="btn-negro btn-sm px-4 modal-guardar"><i class="bi bi-person-plus me-1"></i>Crear cuenta</button>`;
  overlay.classList.add('visible');

  const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,40}$/;
  const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const REGEX_TELEFONO = /^\d{10}$/;

  overlay.querySelector('.modal-cancelar').addEventListener('click', () => overlay.classList.remove('visible'));
  overlay.querySelector('.modal-guardar').addEventListener('click', async () => {
    const nombre = document.getElementById('cue-nombre');
    const apellido = document.getElementById('cue-apellido');
    const apellidoMaterno = document.getElementById('cue-apellido-materno');
    const correo = document.getElementById('cue-correo');
    const telefono = document.getElementById('cue-telefono');
    const contrasena = document.getElementById('cue-contrasena');

    const validarTexto = (input, obligatorio) => {
      const valor = input.value.trim();
      if (!valor) return marcarCampoAdmin(input, !obligatorio, 'Campo obligatorio.');
      return marcarCampoAdmin(input, REGEX_SOLO_LETRAS.test(valor), 'Solo letras, espacios y guiones (máximo 40 caracteres).');
    };
    const validarTelefono = (input) => {
      const valor = input.value.replace(/[\s-]/g, '');
      if (!valor) return marcarCampoAdmin(input, true); // opcional
      return marcarCampoAdmin(input, REGEX_TELEFONO.test(valor), 'El teléfono debe tener 10 dígitos (solo números).');
    };
    const validarCorreo = (input) => marcarCampoAdmin(input, REGEX_CORREO.test(input.value.trim()), 'Correo electrónico inválido.');

    const nombreValido = validarTexto(nombre, true);
    const apellidoValido = validarTexto(apellido, true);
    const apellidoMaternoValido = validarTexto(apellidoMaterno, false);
    const telefonoValido = validarTelefono(telefono);
    const correoValido = validarCorreo(correo);
    const contrasenaValida = contrasena.value.length >= 6;
    marcarCampoAdmin(contrasena, contrasenaValida, 'Debe tener al menos 6 caracteres.');

    if (!nombreValido || !apellidoValido || !apellidoMaternoValido || !telefonoValido ||
        !correoValido || !contrasenaValida) {
      mostrarAlerta('Datos incompletos', 'Revisa los campos marcados.', 'error');
      return;
    }

    const botonGuardar = overlay.querySelector('.modal-guardar');
    try {
      botonGuardar.disabled = true;
      await peticion('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.value.trim(),
          apellido_paterno: apellido.value.trim(),
          apellido_materno: apellidoMaterno.value.trim() || null,
          correo: correo.value.trim(),
          telefono: telefono.value.trim() || null,
          contrasena: contrasena.value,
          rol: document.getElementById('cue-rol').value,
          domicilio: null,
        }),
      });
      overlay.classList.remove('visible');
      mostrarAlerta('Cuenta creada', 'La cuenta se creó correctamente.', 'exito');
      cargarClientesAdmin();
    } catch (error) {
      botonGuardar.disabled = false;
      mostrarAlerta('No se pudo crear la cuenta', error.message, 'error');
    }
  });
}

async function cargarVendedoresAdmin() {
  const contenedor = document.getElementById('vista-vendedores');
  try {
    const vendedores = await peticion('/vendedores');
    contenedor.innerHTML = `
      <h2 class="h5 mb-3"><i class="bi bi-shop icono-acento me-1"></i>Vendedores</h2>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>ID</th><th>Nombre</th><th>Correo</th><th>Artículos</th><th></th></tr>
            </thead>
            <tbody>
              ${vendedores.map((v) => `
                <tr>
                  <td>${v.id_cliente}</td>
                  <td>${v.nombre} ${v.apellido_paterno || ''}</td>
                  <td>${v.correo}</td>
                  <td>${v.total_articulos}</td>
                  <td>
                    <button type="button" class="btn-ghost btn-sm ver-articulos-vendedor" data-id="${v.id_cliente}">
                      <i class="bi bi-eye me-1"></i>Ver artículos
                    </button>
                  </td>
                </tr>
                <tr class="d-none fila-articulos-vendedor" data-vendedor="${v.id_cliente}">
                  <td colspan="5" class="p-3 bg-light">
                    <div class="articulos-vendedor-carga text-muted small">Cargando artículos...</div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.querySelectorAll('.ver-articulos-vendedor').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const id = boton.dataset.id;
        const fila = document.querySelector(`.fila-articulos-vendedor[data-vendedor="${id}"]`);
        fila.classList.toggle('d-none');
        if (fila.dataset.cargado || fila.classList.contains('d-none')) return;
        try {
          const articulos = await peticion(`/vendedores/${id}/articulos`);
          const cuerpo = articulos.map((a) => `
            <tr>
              <td>${a.id_articulo}</td>
              <td>${esc(a.nombre)}</td>
              <td>${a.categoria}</td>
              <td>${formatearPrecio(a.precio_mxn)}</td>
              <td>${a.existencias}</td>
              <td><span class="estado-pastilla ${claseEstado(a.estatus)}"><i class="bi ${iconoEstado(a.estatus)} me-1"></i>${a.estatus}</span></td>
            </tr>`).join('');
          fila.querySelector('.articulos-vendedor-carga').outerHTML = `
            <table class="table table-sm table-bordered mb-0">
              <thead class="small text-muted">
                <tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Estatus</th></tr>
              </thead>
              <tbody>
                ${cuerpo || '<tr><td colspan="6" class="text-muted small">Este vendedor no tiene artículos.</td></tr>'}
              </tbody>
            </table>`;
          fila.dataset.cargado = '1';
        } catch (error) {
          fila.querySelector('.articulos-vendedor-carga').textContent = error.message;
        }
      });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

let temporizadorBitacora = null;

async function cargarBitacoraAdmin(filtros = {}) {
  const contenedor = document.getElementById('vista-bitacora');
  try {
    const params = new URLSearchParams();
    if (filtros.correo) params.set('correo', filtros.correo);
    if (filtros.accion) params.set('accion', filtros.accion);
    const qs = params.toString();
    const registros = await peticion('/bitacora' + (qs ? `?${qs}` : ''));
    const acciones = [...new Set(registros.map((r) => r.accion))].sort();

    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0"><i class="bi bi-journal-text icono-acento me-1"></i>Bitácora de actividad</h2>
      </div>
      <div class="d-flex gap-2 mb-3">
        <input type="text" class="form-control form-control-sm" id="filtro-bitacora-correo"
               placeholder="Filtrar por correo..." style="max-width:260px;" value="${filtros.correo || ''}">
        <select class="form-select form-select-sm" id="filtro-bitacora-accion" style="max-width:240px;">
          <option value="">Todas las acciones</option>
          ${acciones.map((a) => `<option value="${a}" ${filtros.accion === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <div class="tarjeta p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="small text-muted">
              <tr><th>Fecha</th><th>Correo</th><th>Acción</th><th>Entidad</th><th>ID</th><th>IP</th></tr>
            </thead>
            <tbody>
              ${registros.map((r) => `
                <tr>
                  <td>${new Date(r.fecha).toLocaleString('es-MX')}</td>
                  <td>${r.correo || '—'}</td>
                  <td>${r.accion}</td>
                  <td>${r.entidad || '—'}</td>
                  <td>${r.id_entidad ?? '—'}</td>
                  <td>${r.ip || '—'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    const inputCorreo = document.getElementById('filtro-bitacora-correo');
    inputCorreo.addEventListener('input', () => {
      clearTimeout(temporizadorBitacora);
      temporizadorBitacora = setTimeout(() => {
        cargarBitacoraAdmin({ ...filtros, correo: inputCorreo.value.trim() });
      }, 300);
    });
    document.getElementById('filtro-bitacora-accion').addEventListener('change', (e) => {
      cargarBitacoraAdmin({ ...filtros, accion: e.target.value });
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', verificarAdmin);
