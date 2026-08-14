// La consulta de código postal vive en direccion.js (autocompletarCodigoPostalDesde),
// compartida con el formulario de dirección del carrito.

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

function llenarEstados() {
  llenarEstadosDesde('campo-estado');
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
      const destino = datos.usuario.rol === 'administrador' ? 'admin.html'
        : datos.usuario.rol === 'vendedor' ? 'vendedor.html'
        : 'index.html';
      window.location.href = destino;
    }, 900);
  } catch (error) {
    mostrarAlerta('No se pudo iniciar sesión', error.message, 'error');
  }
}

function leerDireccion() {
  const campos = ['reg-nombre-domicilio', 'reg-calle', 'reg-numero', 'reg-colonia', 'reg-cp', 'campo-municipio', 'campo-estado'];
  const vacia = campos.every((id) => !document.getElementById(id).value.trim());
  // La dirección es opcional en el registro: si viene vacía no se guarda nada
  // (el domicilio se pide al generar un pedido en la bolsa).
  if (vacia) return null;
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
  // Opcional: si el usuario dejó todo vacío, se salta la validación.
  const vacia = campos.every((id) => !document.getElementById(id).value.trim());
  if (vacia) return true;
  // Si empezó a llenar, la dirección debe quedar completa.
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

const REGEX_SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{1,40}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^\d{10}$/;

function validarTextoCampo(input, obligatorio) {
  const valor = input.value.trim();
  if (!valor) {
    const mensaje = input.closest('.campo-form')?.querySelector('.mensaje-error');
    if (mensaje) mensaje.textContent = 'Campo obligatorio.';
    return marcarCampo(input, !obligatorio);
  }
  const valido = REGEX_SOLO_LETRAS.test(valor);
  if (!valido) {
    mostrarErrorCampo(input, 'Solo letras, espacios y guiones (máximo 40 caracteres).');
  } else {
    marcarCampo(input, true);
  }
  return valido;
}

function validarTelefonoCampo(input) {
  const valor = input.value.replace(/[\s-]/g, '');
  if (!valor) return marcarCampo(input, true); // opcional
  const valido = REGEX_TELEFONO.test(valor);
  if (!valido) {
    mostrarErrorCampo(input, 'El teléfono debe tener 10 dígitos (solo números).');
  } else {
    marcarCampo(input, true);
  }
  return valido;
}

function validarCorreoCampo(input) {
  const valido = REGEX_CORREO.test(input.value.trim());
  if (!valido) {
    mostrarErrorCampo(input, 'Correo electrónico inválido.');
  } else {
    marcarCampo(input, true);
  }
  return valido;
}

async function registrarUsuario(e) {
  e.preventDefault();

  const nombre = document.getElementById('reg-nombre');
  const apellido = document.getElementById('reg-apellido');
  const apellidoMaterno = document.getElementById('reg-apellido-materno');
  const telefono = document.getElementById('reg-telefono');
  const correo = document.getElementById('reg-correo');
  const contrasena = document.getElementById('reg-contrasena');
  const contrasena2 = document.getElementById('reg-contrasena2');

  const nombreValido = validarTextoCampo(nombre, true);
  const apellidoValido = validarTextoCampo(apellido, true);
  const apellidoMaternoValido = validarTextoCampo(apellidoMaterno, false);
  const telefonoValido = validarTelefonoCampo(telefono);
  const correoValido = validarCorreoCampo(correo);
  const contrasenaValida = contrasena.value.length >= 6;
  const contrasenaCoincide = contrasena.value === contrasena2.value;
  marcarCampo(contrasena, contrasenaValida);
  marcarCampo(contrasena2, contrasenaCoincide);

  if (!nombreValido || !apellidoValido || !apellidoMaternoValido || !telefonoValido ||
      !correoValido || !contrasenaValida || !contrasenaCoincide) {
    mostrarAlerta('Datos incompletos', 'Revisa los campos marcados.', 'error');
    return;
  }

  const direccionValida = validarDireccion();
  if (!direccionValida) {
    mostrarAlerta('Dirección incompleta', 'Completa tu dirección: calle, número, colonia, código postal, municipio y estado.', 'error');
    return;
  }

  const cuerpo = {
    nombre: nombre.value.trim(),
    apellido_paterno: apellido.value.trim(),
    apellido_materno: apellidoMaterno.value.trim() || null,
    correo: correo.value.trim(),
    telefono: telefono.value.trim() || null,
    contrasena: contrasena.value,
    // El registro público siempre crea un comprador (rol 'cliente' en el sistema).
    rol: 'cliente',
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
    if (/^\d{5}$/.test(cp.value.trim())) {
      autocompletarCodigoPostalDesde(cp, 'campo-municipio', 'campo-estado', 'reg-colonia');
    }
  });
});
