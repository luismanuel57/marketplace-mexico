async function cargarDetalle() {
  const contenedor = document.getElementById('detalle-articulo');
  const parametros = new URLSearchParams(window.location.search);
  const id = parametros.get('id');
  if (!id) {
    contenedor.innerHTML = `<p class="text-danger">Artículo no especificado.</p>`;
    return;
  }

  try {
    const articulo = await peticion(`/articulos/${id}`);
    const agotado = Number(articulo.existencias) <= 0;

    contenedor.innerHTML = `
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb small">
          <li class="breadcrumb-item"><a href="catalogo.html">Catálogo</a></li>
          <li class="breadcrumb-item active">${articulo.nombre}</li>
        </ol>
      </nav>

      <div class="row g-4">
        <div class="col-lg-6">
          <img src="${articulo.imagen_url || 'https://placehold.co/900x700/f5f5f5/9a9a9a?text=Tianguis'}"
               class="detalle-imagen" alt="${articulo.nombre}"
               onerror="this.onerror=null;this.src='https://placehold.co/900x700/f5f5f5/9a9a9a?text=Tianguis';">
        </div>
        <div class="col-lg-6">
          <div class="d-flex align-items-center gap-2 mb-2">
            <span class="tarjeta-categoria">${articulo.categoria}</span>
            ${articulo.marca ? `<span class="estado-pastilla">${articulo.marca}</span>` : ''}
          </div>
          <h1 class="h3 fw-bold mb-2">${articulo.nombre}</h1>
          <p class="text-muted">${articulo.descripcion || 'Sin descripción disponible.'}</p>
          <div class="h3 fw-bold mb-3">${formatearPrecio(articulo.precio_mxn)}</div>
          <p class="small ${agotado ? 'text-danger' : 'text-success'}">
            ${agotado ? 'Agotado' : `${articulo.existencias} disponibles`}
          </p>
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="d-flex align-items-center border rounded-pill overflow-hidden">
              <button type="button" class="btn btn-sm px-3" id="btn-menos" ${agotado ? 'disabled' : ''}>−</button>
              <span class="px-3" id="cantidad-mostrada">1</span>
              <button type="button" class="btn btn-sm px-3" id="btn-mas" ${agotado ? 'disabled' : ''}>+</button>
            </div>
            <button type="button" class="btn-negro flex-grow-1" id="btn-agregar" ${agotado ? 'disabled' : ''}>
              <i class="bi bi-bag me-1"></i> Agregar a la bolsa
            </button>
          </div>
          <a href="catalogo.html" class="btn-ghost">&larr; Seguir comprando</a>
        </div>
      </div>`;

    let cantidad = 1;
    document.getElementById('btn-mas').addEventListener('click', () => {
      if (cantidad < articulo.existencias) {
        cantidad += 1;
        document.getElementById('cantidad-mostrada').textContent = cantidad;
      }
    });
    document.getElementById('btn-menos').addEventListener('click', () => {
      if (cantidad > 1) {
        cantidad -= 1;
        document.getElementById('cantidad-mostrada').textContent = cantidad;
      }
    });
    document.getElementById('btn-agregar').addEventListener('click', async () => {
      const usuario = obtenerUsuario();
      if (!usuario) {
        mostrarAlerta('Inicia sesión', 'Debes iniciar sesión para agregar artículos a tu bolsa.', 'info');
        window.location.href = 'login.html';
        return;
      }
      try {
        await peticion('/bolsa', {
          method: 'POST',
          body: JSON.stringify({ id_articulo: articulo.id_articulo, cantidad }),
        });
        const bolsa = JSON.parse(localStorage.getItem('bolsa') || '[]');
        bolsa.push({ id_articulo: articulo.id_articulo, cantidad });
        localStorage.setItem('bolsa', JSON.stringify(bolsa));
        actualizarContadorBolsa();
        mostrarAlerta('Agregado', 'El artículo se agregó a tu bolsa.', 'exito');
      } catch (error) {
        mostrarAlerta('No se pudo agregar', error.message, 'error');
      }
    });
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', cargarDetalle);
