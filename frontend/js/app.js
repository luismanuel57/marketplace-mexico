async function cargarCategorias() {
  const contenedor = document.getElementById('lista-categorias');
  if (!contenedor) return;
  try {
    const categorias = await peticion('/categorias');
    contenedor.innerHTML = categorias
      .map((c) => `<div class="col-6 col-md-4 col-lg-3">
          <div class="card h-100 text-center p-3">
            <i class="bi bi-grid fs-3"></i>
            <h6 class="mt-2 mb-0">${c.nombre}</h6>
          </div>
        </div>`)
      .join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">No se pudieron cargar las categorías.</p>`;
  }
}

async function cargarDestacados() {
  const contenedor = document.getElementById('lista-destacados');
  if (!contenedor) return;
  try {
    const productos = await peticion('/productos?destacados=true');
    contenedor.innerHTML = productos
      .map(
        (p) => `<div class="col-md-6 col-lg-4 col-xl-3">
          <div class="card h-100">
            <img src="${p.imagen_url}" class="card-img-top" alt="${p.nombre}">
            <div class="card-body d-flex flex-column">
              <h6 class="card-title">${p.nombre}</h6>
              <p class="card-text text-truncate">${p.descripcion || ''}</p>
              <p class="fw-bold mt-auto">${formatearPrecio(p.precio_mxn)}</p>
            </div>
          </div>
        </div>`
      )
      .join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">No se pudieron cargar los productos.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarCategorias();
  cargarDestacados();
});
