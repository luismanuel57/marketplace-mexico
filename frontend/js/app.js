function actualizarNavbar() {
  const contenedor = document.getElementById('area-sesion');
  if (!contenedor) return;
  const usuario = obtenerUsuario();

  if (usuario) {
    const enlaceAdmin = usuario.rol === 'administrador'
      ? '<li class="nav-item"><a class="nav-link" href="admin.html">Panel</a></li>'
      : '';
    const enlacePedidos = '<li class="nav-item"><a class="nav-link" href="pedidos.html">Mis pedidos</a></li>';
    contenedor.innerHTML = `
      <li class="nav-item"><span class="nav-link text-muted">Hola, ${usuario.nombre}</span></li>
      ${enlacePedidos}
      ${enlaceAdmin}
      <li class="nav-item"><a class="nav-link" href="#" id="enlace-salir">Cerrar sesión</a></li>`;
    document.getElementById('enlace-salir').addEventListener('click', (e) => {
      e.preventDefault();
      cerrarSesion();
      actualizarNavbar();
      mostrarAlerta('Sesión cerrada', 'Has cerrado tu sesión correctamente.', 'info');
    });
  } else {
    contenedor.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="login.html">Iniciar sesión</a></li>
      <li class="nav-item"><a class="btn-contorno btn-sm px-4 ms-2" href="login.html?registro=1">Registrarse</a></li>`;
  }
}

async function actualizarContadorBolsa() {
  const contador = document.getElementById('contador-bolsa');
  if (!contador) return;
  const usuario = obtenerUsuario();
  if (!usuario) {
    contador.textContent = '0';
    return;
  }
  try {
    const bolsa = await peticion('/bolsa');
    const total = bolsa.articulos.reduce((suma, item) => suma + item.cantidad, 0);
    contador.textContent = total;
  } catch {
    contador.textContent = '0';
  }
}

async function cargarCategorias() {
  const contenedor = document.getElementById('lista-categorias');
  if (!contenedor) return;
  try {
    const categorias = await peticion('/categorias');
    contenedor.innerHTML = categorias
      .map((c) => `<div class="col-6 col-md-4 col-lg-3">
          <a class="tarjeta h-100 d-block text-center p-4" href="catalogo.html?categoria=${encodeURIComponent(c.nombre)}">
            <i class="bi bi-grid fs-4"></i>
            <h6 class="mt-3 mb-0">${c.nombre}</h6>
          </a>
        </div>`)
      .join('');
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

function tarjetaArticulo(articulo) {
  const disponible = articulo.disponible === false || Number(articulo.existencias) <= 0;
  return `<div class="col-md-6 col-lg-4 col-xl-3">
      <div class="tarjeta h-100 d-flex flex-column">
        <a href="detalle.html?id=${articulo.id_articulo}" class="d-block">
          <img src="${articulo.imagen_url || 'https://placehold.co/600x400/f5f5f5/9a9a9a?text=Tianguis'}"
               class="tarjeta-img" alt="${articulo.nombre}"
               onerror="this.onerror=null;this.src='https://placehold.co/600x400/f5f5f5/9a9a9a?text=Tianguis';">
        </a>
        <div class="p-3 d-flex flex-column flex-grow-1">
          ${articulo.categoria ? `<span class="tarjeta-categoria mb-1">${articulo.categoria}</span>` : ''}
          <a href="detalle.html?id=${articulo.id_articulo}" class="text-decoration-none text-body">
            <h6 class="mb-1">${articulo.nombre}</h6>
          </a>
          <p class="text-muted small text-truncate mb-2">${articulo.descripcion || ''}</p>
          <div class="mt-auto d-flex align-items-center justify-content-between">
            <span class="tarjeta-precio">${formatearPrecio(articulo.precio_mxn)}</span>
            ${disponible
              ? '<span class="estado-pastilla">Agotado</span>'
              : '<button class="btn-negro btn-sm px-3 boton-agregar" data-id="' + articulo.id_articulo + '">Agregar</button>'}
          </div>
        </div>
      </div>
    </div>`;
}

async function cargarDestacados() {
  const contenedor = document.getElementById('lista-destacados');
  if (!contenedor) return;
  try {
    const articulos = await peticion('/articulos?disponible=true&destacados=true');
    contenedor.innerHTML = articulos.map(tarjetaArticulo).join('');
    vincularBotonesAgregar();
  } catch (error) {
    contenedor.innerHTML = `<p class="text-danger">${error.message}</p>`;
  }
}

async function agregarArticulo(idArticulo) {
  const usuario = obtenerUsuario();
  if (!usuario) {
    mostrarAlerta('Inicia sesión', 'Debes iniciar sesión para agregar artículos a tu bolsa.', 'info');
    window.location.href = 'login.html';
    return;
  }
  try {
    await peticion('/bolsa', { method: 'POST', body: JSON.stringify({ id_articulo: idArticulo, cantidad: 1 }) });
    actualizarContadorBolsa();
    mostrarAlerta('Agregado', 'El artículo se agregó a tu bolsa.', 'exito');
  } catch (error) {
    mostrarAlerta('No se pudo agregar', error.message, 'error');
  }
}

function vincularBotonesAgregar() {
  document.querySelectorAll('.boton-agregar').forEach((boton) => {
    boton.addEventListener('click', () => agregarArticulo(Number(boton.dataset.id)));
  });
}

function configurarBuscadorHero() {
  const formulario = document.getElementById('buscador-hero');
  if (!formulario) return;
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = document.getElementById('texto-busqueda').value.trim();
    const destino = texto ? `catalogo.html?q=${encodeURIComponent(texto)}` : 'catalogo.html';
    window.location.href = destino;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  actualizarNavbar();
  actualizarContadorBolsa();
  cargarCategorias();
  cargarDestacados();
  configurarBuscadorHero();
});
