// Consulta de código postal contra el backend de Tianguis Digital.
// El backend responde desde la API de postali.app (fuente: 'api') o desde
// el catálogo local SEPOMEX (fuente: 'bd') como respaldo. La ruta es
// pública: funciona tanto en el registro (sin sesión) como en el carrito.
// El prefijo lo agrega peticion() de api.js (http://localhost:3000/api).
const URL_CODIGOS_POSTALES = '/domicilios/consulta-cp/';

const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila de Zaragoza',
  'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán de Ocampo', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo',
  'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz de Ignacio de la Llave', 'Yucatán', 'Zacatecas',
];

function llenarEstadosDesde(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;
  select.innerHTML = `<option value="">Selecciona un estado...</option>` +
    ESTADOS_MEXICO.map((e) => `<option value="${e}">${e}</option>`).join('');
}

// Llena el campo colonia con el listado del código postal: si es un select
// agrega todas las opciones y preselecciona la primera; si es un input de
// texto, escribe la primera colonia (los formularios actuales usan input).
function llenarColonias(campoColonia, colonias) {
  if (!campoColonia || !Array.isArray(colonias) || colonias.length === 0) return;
  if (campoColonia.tagName === 'SELECT') {
    campoColonia.innerHTML = colonias.map((c) => `<option value="${c}">${c}</option>`).join('');
    campoColonia.selectedIndex = 0;
  } else {
    campoColonia.value = colonias[0];
  }
}

async function autocompletarCodigoPostalDesde(input, idMunicipio, idEstado, idColonia) {
  const codigo = input.value.trim();
  if (!/^\d{5}$/.test(codigo)) return;

  const campoMunicipio = document.getElementById(idMunicipio);
  const campoEstado = document.getElementById(idEstado);
  const campoColonia = idColonia ? document.getElementById(idColonia) : null;
  const aviso = document.getElementById('aviso-cp');

  input.classList.remove('invalido');
  campoMunicipio.disabled = true;
  campoEstado.disabled = true;
  if (campoColonia) campoColonia.disabled = true;
  if (aviso) aviso.textContent = 'Buscando código postal...';

  try {
    const datos = await peticion(`${URL_CODIGOS_POSTALES}${codigo}`);
    if (!datos.estado || !datos.municipio) throw new Error('Código postal no encontrado');

    campoMunicipio.value = datos.municipio;
    campoEstado.value = datos.estado;
    campoMunicipio.disabled = true;
    campoEstado.disabled = true;

    if (campoColonia) {
      llenarColonias(campoColonia, datos.colonias);
      campoColonia.disabled = true;
    }
    if (aviso) aviso.textContent = '';
  } catch (error) {
    campoMunicipio.disabled = false;
    campoEstado.disabled = false;
    if (campoColonia) campoColonia.disabled = false;
    input.classList.add('invalido');
    if (aviso) aviso.textContent = error.message;
  }
}
