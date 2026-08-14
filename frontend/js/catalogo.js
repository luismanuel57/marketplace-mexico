let categoriasCache = [];
// Control de carrera: cada petición toma un número de turno; solo la más
// reciente puede pintar sus resultados.
let ultimaPeticion = 0;
let temporizadorBusqueda = null;

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

// Texto legible con los filtros activos (null si no hay ninguno).
function textoContextoFiltros() {
  const busqueda = document.getElementById('filtro-busqueda').value.trim();
  const categoria = document.getElementById('filtro-categoria').value;
  const precioMin = document.getElementById('filtro-precio-min').value;
  const precioMax = document.getElementById('filtro-precio-max').value;
  const detalles = [];
  if (busqueda) detalles.push(`resultados para "${busqueda}"`);
  if (categoria) detalles.push(`categoría "${categoria}"`);
  if (precioMin !== '' || precioMax !== '') {
    detalles.push(`precio de $${precioMin || '0'} a $${precioMax || 'sin tope'}`);
  }
  return detalles.length ? `Mostrando ${detalles.join(' · ')}` : null;
}

async function cargarResultados() {
  const contenedor = document.getElementById('resultados');
  if (!contenedor) return;
  const actual = ++ultimaPeticion;
  contenedor.innerHTML = `<p class="text-muted">Cargando productos...</p>`;
  try {
    const query = construirQueryFiltros();
    const articulos = await peticion(`/articulos?${query}`);
    // Si entre tanto se lanzó otra petición, esta respuesta ya está obsoleta.
    if (actual !== ultimaPeticion) return;

    const contexto = textoContextoFiltros();
    const franjaContexto = contexto
      ? `<div class="col-12">
          <div class="d-flex flex-wrap align-items-center justify-content-between text-muted small mb-1">
            <span><i class="bi bi-funnel me-1"></i>${contexto}</span>
            <button type="button" class="btn-ghost" data-accion="limpiar-filtros">
              <i class="bi bi-x-circle me-1"></i>Limpiar
            </button>
          </div>
        </div>`
      : '';

    if (articulos.length === 0) {
      contenedor.innerHTML = `${franjaContexto}
        <div class="col-12">
          <div class="tarjeta p-5 text-center">
            <i class="bi bi-search fs-1 text-muted"></i>
            <p class="text-muted mt-3 mb-0">No se encontraron productos con esos filtros.</p>
          </div>
        </div>`;
      return;
    }
    contenedor.innerHTML = `${franjaContexto}${articulos.map(tarjetaArticulo).join('')}`;
    vincularBotonesAgregar();
  } catch (error) {
    if (actual !== ultimaPeticion) return;
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

// Vuelve al catálogo completo: limpia el formulario, borra los parámetros de la
// URL (replaceState para no ensuciar el historial) y recarga los resultados.
function limpiarFiltros() {
  document.getElementById('form-filtros').reset();
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
  cargarResultados();
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategoriasFiltro();

  // Los parámetros de la URL se aplican a los inputs ANTES de la primera carga:
  // así solo hay una petición inicial con los filtros correctos.
  const url = new URLSearchParams(window.location.search);
  const categoriaParam = url.get('categoria');
  const busquedaParam = url.get('q');
  if (categoriaParam) document.getElementById('filtro-categoria').value = categoriaParam;
  if (busquedaParam) document.getElementById('filtro-busqueda').value = busquedaParam;
  cargarResultados();

  document.getElementById('form-filtros').addEventListener('submit', (e) => {
    e.preventDefault();
    cargarResultados();
  });

  document.getElementById('btn-limpiar').addEventListener('click', limpiarFiltros);

  // Debounce: al escribir no se lanza una petición por tecla, solo 250ms
  // después de la última pulsación.
  const busqueda = document.getElementById('filtro-busqueda');
  busqueda.addEventListener('keyup', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(cargarResultados, 250);
  });
  document.getElementById('filtro-categoria').addEventListener('change', cargarResultados);
  document.getElementById('filtro-precio-min').addEventListener('change', cargarResultados);
  document.getElementById('filtro-precio-max').addEventListener('change', cargarResultados);

  // El botón "Limpiar" del contexto de resultados se repinta en cada carga,
  // así que se enlaza por delegación sobre el contenedor estático.
  document.getElementById('resultados').addEventListener('click', (e) => {
    if (e.target.closest('[data-accion="limpiar-filtros"]')) {
      limpiarFiltros();
    }
  });
});
