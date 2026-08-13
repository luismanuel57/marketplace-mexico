let categoriasCache = [];

async function cargarCategoriasFiltro() {
  const select = document.getElementById('filtro-categoria');
  if (!select) return;
  try {
    categoriasCache = await peticion('/categorias');
    select.innerHTML = `<option value="">Todas</option>` +
      categoriasCache.map((c) => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
  } catch {
    select.innerHTML = `<option value="">Todas</option>`;
  }
}

function construirQueryFiltros() {
  const parametros = new URLSearchParams();
  const busqueda = document.getElementById('filtro-busqueda').value.trim();
  const categoria = document.getElementById('filtro-categoria').value;
  const precioMin = document.getElementById('filtro-precio-min').value;
  const precioMax = document.getElementById('filtro-precio-max').value;

  if (busqueda) parametros.set('q', busqueda);
  if (categoria) parametros.set('categoria', categoria);
  if (precioMin) parametros.set('precio_min', precioMin);
  if (precioMax) parametros.set('precio_max', precioMax);
  parametros.set('disponible', 'true');
  return parametros.toString();
}

async function cargarResultados() {
  const contenedor = document.getElementById('resultados');
  if (!contenedor) return;
  contenedor.innerHTML = `<p class="text-muted">Cargando productos...</p>`;
  try {
    const query = construirQueryFiltros();
    const articulos = await peticion(`/articulos?${query}`);
    if (articulos.length === 0) {
      contenedor.innerHTML = `<div class="col-12">
        <div class="tarjeta p-5 text-center">
          <i class="bi bi-search fs-1 text-muted"></i>
          <p class="text-muted mt-3 mb-0">No se encontraron productos con esos filtros.</p>
        </div>
      </div>`;
      return;
    }
    contenedor.innerHTML = articulos.map(tarjetaArticulo).join('');
    vincularBotonesAgregar();
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategoriasFiltro();
  cargarResultados();

  const url = new URLSearchParams(window.location.search);
  const categoriaParam = url.get('categoria');
  const busquedaParam = url.get('q');
  if (categoriaParam) {
    document.getElementById('filtro-categoria').value = categoriaParam;
  }
  if (busquedaParam) {
    document.getElementById('filtro-busqueda').value = busquedaParam;
  }
  if (categoriaParam || busquedaParam) {
    cargarResultados();
  }

  document.getElementById('form-filtros').addEventListener('submit', (e) => {
    e.preventDefault();
    cargarResultados();
  });

  document.getElementById('btn-limpiar').addEventListener('click', () => {
    document.getElementById('form-filtros').reset();
    cargarResultados();
  });

  const busqueda = document.getElementById('filtro-busqueda');
  busqueda.addEventListener('keyup', () => cargarResultados());
  document.getElementById('filtro-categoria').addEventListener('change', cargarResultados);
  document.getElementById('filtro-precio-min').addEventListener('change', cargarResultados);
  document.getElementById('filtro-precio-max').addEventListener('change', cargarResultados);
});
