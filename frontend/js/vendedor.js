function verificarVendedor() {
  const contenedor = document.getElementById('contenido-vendedor');
  const usuario = obtenerUsuario();
  if (!usuario || (usuario.rol !== 'vendedor' && usuario.rol !== 'administrador')) {
    window.location.href = 'login.html';
    return;
  }
  cargarArticulosVendedor();
}

async function cargarArticulosVendedor() {
  const contenedor = document.getElementById('contenido-vendedor');
  const usuario = obtenerUsuario();
  try {
    // El backend filtra por ?vendedor=<id>; el filtro en el cliente es una
    // red de seguridad por si el filtro del servidor no estuviera disponible.
    const articulos = await peticion(`/articulos?vendedor=${usuario.id}`);
    const propios = articulos.filter((a) => Number(a.id_vendedor) === Number(usuario.id));

    const filas = propios.map((a) => `
                <tr>
                  <td>
                    <img src="${a.imagen_url || 'https://placehold.co/40x40/f5f5f5/9a9a9a?text=?'}"
                         alt="${a.nombre}" class="rounded"
                         style="width:40px;height:40px;object-fit:cover;"
                         onerror="this.onerror=null;this.src='https://placehold.co/40x40/f5f5f5/9a9a9a?text=?';">
                  </td>
                  <td>${a.nombre}</td>
                  <td>${a.categoria}</td>
                  <td>${formatearPrecio(a.precio_mxn)}</td>
                  <td>${a.existencias}</td>
                  <td><span class="estado-pastilla">${a.estatus}</span></td>
                  <td>${a.destacado ? 'Sí' : 'No'}</td>
                  <td>
                    <button type="button" class="btn-ghost btn-sm editar-articulo" data-id="${a.id_articulo}">Editar</button>
                    ${a.estatus === 'activo'
                      ? `<button type="button" class="btn-ghost btn-sm desactivar-articulo" data-id="${a.id_articulo}">Desactivar</button>`
                      : `<button type="button" class="btn-ghost btn-sm activar-articulo" data-id="${a.id_articulo}">Activar</button>`}
                  </td>
                </tr>`).join('');

    const tabla = propios.length === 0
      ? '<div class="tarjeta p-4 text-center text-muted">Aún no publicas artículos. ¡Crea el primero con el botón "Nuevo artículo"!</div>'
      : `<div class="tarjeta p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="small text-muted">
                <tr><th>Imagen</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Existencias</th><th>Estatus</th><th>Destacado</th><th></th></tr>
              </thead>
              <tbody>
                ${filas}
              </tbody>
            </table>
          </div>
        </div>`;

    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0">Mis artículos</h2>
        <button type="button" class="btn-negro btn-sm" id="btn-nuevo-articulo">+ Nuevo artículo</button>
      </div>
      ${tabla}`;

    document.getElementById('btn-nuevo-articulo').addEventListener('click', () => mostrarFormularioArticulo());
    document.querySelectorAll('.editar-articulo').forEach((boton) => {
      boton.addEventListener('click', () => {
        const art = propios.find((a) => a.id_articulo === Number(boton.dataset.id));
        if (!art) return;
        mostrarFormularioArticulo(art);
      });
    });
    document.querySelectorAll('.desactivar-articulo').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const confirmar = await mostrarConfirmacion('Desactivar artículo', 'El artículo dejará de estar visible en la tienda. ¿Continuar?');
        if (!confirmar) return;
        try {
          await peticion(`/articulos/${boton.dataset.id}`, { method: 'DELETE' });
          mostrarAlerta('Artículo desactivado', 'El artículo se desactivó correctamente.', 'exito');
          cargarArticulosVendedor();
        } catch (error) {
          mostrarAlerta('No se pudo desactivar', error.message, 'error');
        }
      });
    });
    document.querySelectorAll('.activar-articulo').forEach((boton) => {
      boton.addEventListener('click', async () => {
        const confirmar = await mostrarConfirmacion('Activar artículo', 'El artículo volverá a estar visible en la tienda. ¿Continuar?');
        if (!confirmar) return;
        try {
          await peticion(`/articulos/${boton.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ estatus: 'activo' }),
          });
          mostrarAlerta('Artículo activado', 'El artículo volvió a estar visible en la tienda.', 'exito');
          cargarArticulosVendedor();
        } catch (error) {
          mostrarAlerta('No se pudo activar', error.message, 'error');
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
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      <select class="form-select" id="art-categoria">${opciones}</select>
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
    <button type="button" class="btn-negro btn-sm px-4 modal-guardar">Guardar</button>`;
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
      cargarArticulosVendedor();
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

document.addEventListener('DOMContentLoaded', verificarVendedor);
