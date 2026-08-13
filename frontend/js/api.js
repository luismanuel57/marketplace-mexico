const API_URL = 'http://localhost:3000/api';

function obtenerToken() {
  return localStorage.getItem('token');
}

function obtenerUsuario() {
  const datos = localStorage.getItem('usuario');
  try {
    return datos ? JSON.parse(datos) : null;
  } catch {
    return null;
  }
}

function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
}

async function peticion(ruta, opciones = {}) {
  const cabeceras = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, { ...opciones, headers: cabeceras });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté en marcha.');
  }

  if (!respuesta.ok) {
    let detalle = null;
    try {
      detalle = await respuesta.json();
    } catch {
      detalle = null;
    }
    if (respuesta.status === 401) {
      cerrarSesion();
      throw new Error(detalle?.error || 'Tu sesión expiró. Inicia sesión de nuevo.');
    }
    throw new Error(detalle?.error || `Error en la petición (${respuesta.status})`);
  }
  return respuesta.json();
}

async function subirImagenDrive(archivo, categoria) {
  const datos = new FormData();
  datos.append('imagen', archivo);
  datos.append('categoria', categoria);

  const cabeceras = {};
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/upload/imagen`, { method: 'POST', headers: cabeceras, body: datos });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté en marcha.');
  }

  const detalle = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401) {
      cerrarSesion();
      throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    }
    throw new Error(detalle?.error || `Error al subir la imagen (${respuesta.status})`);
  }
  return detalle;
}

function formatearPrecio(monto) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(monto);
}

function formatearEstado(estado) {
  const estados = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    preparando: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  };
  return estados[estado] || estado;
}
