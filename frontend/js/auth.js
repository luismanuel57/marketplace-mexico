const URL_CODIGOS_POSTALES = 'https://postali.app/api/v1/mx/cp/';

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila de Zaragoza',
  'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán de Ocampo', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz de Ignacio de la Llave', 'Yucatán', 'Zacatecas',
];

function configurarPestanas() {
  const pestanas = document.querySelectorAll('.pestana-auth');
  pestanas.forEach((pestana) => {
    pestana.addEventListener('click', () => {
      pestanas.forEach((p) => p.classList.remove('activa'));
      pestana.classList.add('activa');
      document.querySelectorAll('.vista-auth').forEach((v) => v.classList.add('d-none'));
      document.getElementById(pestana.dataset.vista).classList.remove('d-none');
    });
  });
}

function validarCampo(input) {
  const invalido = !input.value.trim();
  input.classList.toggle('invalido', invalido);
  const mensaje = input.closest('.campo-form')?.querySelector('.mensaje-error');
  if (mensaje) mensaje.classList.toggle('visible', invalido);
  return !invalido;
}

function marcarCampo(input, valido) {
  input.classList.toggle('invalido', !valido);
  const mensaje = input.closest('.campo-form')?.querySelector('.mensaje-error');
  if (mensaje) mensaje.classList.toggle('visible', !valido);
  return valido;
}

function mostrarErrorCampo(input, mensaje) {
  input.classList.add('invalido');
  const contenedor = input.closest('.campo-form')?.querySelector('.mensaje-error');
  if (contenedor) {
    contenedor.textContent = mensaje;
    contenedor.classList.add('visible');
  }
}

async function autocompletarCodigoPostal(input) {
  const codigo = input.value.trim();
  if (!/^\d{5}$/.test(codigo)) return;

  const campoMunicipio = document.getElementById('campo-municipio');
  const campoEstado = document.getElementById('campo-estado');

  mostrarAlerta('Consultando...', 'Buscando el código postal en SEPOMEX.', 'info');
  try {
    const respuesta = await fetch(`${URL_CODIGOS_POSTALES}${codigo}`);
    if (!respuesta.ok) throw new Error('Código postal no encontrado');
    const datos = await respuesta.json();
    if (!datos.estado || !datos.municipio) throw new Error('Código postal no encontrado');

    campoMunicipio.value = datos.municipio;
    campoEstado.value = datos.estado;
    campoMunicipio.disabled = true;
    campoEstado.disabled = true;
    marcarCampo(campoMunicipio, true);
    marcarCampo(campoEstado, true);
    cerrarModal();
  } catch (error) {
    cerrarModal();
    campoMunicipio.disabled = false;
    campoEstado.disabled = false;
    mostrarErrorCampo(input, error.message);
  }
}

function llenarEstados() {
  const select = document.getElementById('campo-estado');
  if (!select) return;
  select.innerHTML = `<option value="">Selecciona un estado...</option>` +
    ESTADOS_MEXICO.map((e) => `<option value="${e}">${e}</option>`).join('');
}

async function iniciarSesion(e) {
  e.preventDefault();
  const correo = document.getElementById('login-correo');
  const contrasena = document.getElementById('login-contrasena');

  const correoValido = marcarCampo(correo, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim()));
  const contrasenaValida = validarCampo(contrasena);
  if (!correoValido || !contrasenaValida) {
    mostrarAlerta('Datos incompletos', 'Revisa que el correo y la contraseña sean válidos.', 'error');
    return;
  }

  try {
    const datos = await peticion('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo: correo.value.trim(), contrasena: contrasena.value }),
    });
    guardarSesion(datos.token, datos.usuario);
    mostrarAlerta('Bienvenido', `Hola, ${datos.usuario.nombre}. Sesión iniciada.`, 'exito');
    setTimeout(() => {
      window.location.href = datos.usuario.rol === 'administrador' ? 'admin.html' : 'index.html';
    }, 900);
  } catch (error) {
    mostrarAlerta('No se pudo iniciar sesión', error.message, 'error');
  }
}

function leerDireccion() {
  return {
    nombre: document.getElementById('reg-nombre-domicilio').value.trim() || null,
    calle: document.getElementById('reg-calle').value.trim(),
    numero: document.getElementById('reg-numero').value.trim() || null,
    colonia: document.getElementById('reg-colonia').value.trim(),
    codigo_postal: document.getElementById('reg-cp').value.trim(),
    municipio: document.getElementById('campo-municipio').value.trim(),
    estado: document.getElementById('campo-estado').value.trim(),
    pais: 'México',
  };
}

function validarDireccion() {
  const campos = ['reg-calle', 'reg-colonia', 'reg-cp', 'campo-municipio', 'campo-estado'];
  const validos = campos.map((id) => {
    const input = document.getElementById(id);
    const valido = input.value.trim() !== '';
    marcarCampo(input, valido);
    return valido;
  });
  const cp = document.getElementById('reg-cp');
  const cpValido = /^\d{5}$/.test(cp.value.trim());
  marcarCampo(cp, cpValido);
  return validos.every(Boolean) && cpValido;
}

async function registrarUsuario(e) {
  e.preventDefault();
  const campos = ['reg-nombre', 'reg-apellido', 'reg-correo', 'reg-contrasena', 'reg-contrasena2'];
  const validos = campos.map((id) => validarCampo(document.getElementById(id)));

  const correo = document.getElementById('reg-correo');
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.value.trim());
  marcarCampo(correo, correoValido);

  const contrasena = document.getElementById('reg-contrasena');
  const contrasena2 = document.getElementById('reg-contrasena2');
  const coinciden = contrasena.value === contrasena2.value;
  marcarCampo(contrasena, contrasena.value.length >= 6);
  marcarCampo(contrasena2, coinciden);

  if (!validos.every(Boolean) || !correoValido || contrasena.value.length < 6 || !coinciden) {
    mostrarAlerta('Datos incompletos', 'Revisa los campos marcados. La contraseña debe coincidir y tener al menos 6 caracteres.', 'error');
    return;
  }

  const direccionValida = validarDireccion();
  if (!direccionValida) {
    mostrarAlerta('Dirección incompleta', 'Completa tu dirección: calle, número, colonia, código postal, municipio y estado.', 'error');
    return;
  }

  const cuerpo = {
    nombre: document.getElementById('reg-nombre').value.trim(),
    apellido_paterno: document.getElementById('reg-apellido').value.trim(),
    apellido_materno: document.getElementById('reg-apellido-materno').value.trim() || null,
    correo: correo.value.trim(),
    telefono: document.getElementById('reg-telefono').value.trim() || null,
    contrasena: contrasena.value,
    domicilio: leerDireccion(),
  };

  try {
    await peticion('/auth/registro', { method: 'POST', body: JSON.stringify(cuerpo) });
    mostrarAlerta('Cuenta creada', 'Tu cuenta se creó correctamente. Ya puedes iniciar sesión.', 'exito');
    setTimeout(() => {
      document.querySelectorAll('.pestana-auth').forEach((p) => p.classList.remove('activa'));
      document.querySelector('[data-vista="form-login"]').classList.add('activa');
      document.querySelectorAll('.vista-auth').forEach((v) => v.classList.add('d-none'));
      document.getElementById('form-login').classList.remove('d-none');
      e.target.reset();
    }, 1200);
  } catch (error) {
    mostrarAlerta('No se pudo registrar', error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  configurarPestanas();
  llenarEstados();
  const url = new URLSearchParams(window.location.search);
  if (url.get('registro')) {
    document.querySelector('[data-vista="form-registro"]').classList.add('activa');
    document.querySelectorAll('.vista-auth').forEach((v) => v.classList.add('d-none'));
    document.getElementById('form-registro').classList.remove('d-none');
    document.querySelector('[data-vista="form-login"]').classList.remove('activa');
  }

  document.getElementById('form-login').addEventListener('submit', iniciarSesion);
  document.getElementById('form-registro').addEventListener('submit', registrarUsuario);

  const cp = document.getElementById('reg-cp');
  cp.addEventListener('input', () => {
    if (/^\d{5}$/.test(cp.value.trim())) autocompletarCodigoPostal(cp);
  });
});
