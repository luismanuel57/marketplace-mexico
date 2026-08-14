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

// Nombres alternativos que pueden devolver la API o el catálogo SEPOMEX
// para estados cuyo nombre en ESTADOS_MEXICO es distinto (ej. la fuente
// externa devuelve "México" y el select ofrece "Estado de México").
const ALIASES_ESTADOS = {
  'México': 'Estado de México',
  'Veracruz': 'Veracruz de Ignacio de la Llave',
  'Michoacán': 'Michoacán de Ocampo',
  'Coahuila': 'Coahuila de Zaragoza',
};

// Normaliza el nombre de estado de la API/SEPOMEX al nombre usado en
// ESTADOS_MEXICO; si no hay alias conocido, devuelve el nombre tal cual.
function normalizarEstado(nombre) {
  return ALIASES_ESTADOS[nombre] || nombre;
}

// Selecciona el estado en el <select> sin bloquear el formulario: si el
// nombre (normalizado) ya está entre las opciones lo selecciona y, si no,
// agrega la opción dinámicamente para que el submit nunca falle por un
// estado que el listado no contempla.
function asignarEstado(select, nombreEstado) {
  if (!select || !nombreEstado) return;
  const nombre = normalizarEstado(nombreEstado);
  if (Array.from(select.options).some((opcion) => opcion.value === nombre)) {
    select.value = nombre;
    return;
  }
  const opcion = document.createElement('option');
  opcion.value = nombre;
  opcion.textContent = nombre;
  select.appendChild(opcion);
  select.value = nombre;
}

// Cuando el autocompletado convierte un input de colonia en select (hay
// varias colonias para el CP), guarda el input original para poder
// restaurarlo si el usuario cambia el CP o falla la consulta.
const coloniasOriginales = new Map();

function convertirColoniaASelect(campoColonia) {
  if (campoColonia.tagName === 'SELECT') return campoColonia;
  const select = document.createElement('select');
  // Conserva el id para que la validación del formulario siga leyendo el
  // valor por el mismo id, y el estilo de Bootstrap (form-control -> form-select).
  select.id = campoColonia.id;
  select.name = campoColonia.name || '';
  select.className = (campoColonia.className || '').replace('form-control', 'form-select');
  campoColonia.parentNode.replaceChild(select, campoColonia);
  coloniasOriginales.set(campoColonia.id, campoColonia);
  return select;
}

// Restaura el input original cuando ya no aplica un select de colonias.
// Devuelve el elemento que queda en el DOM (el input restaurado o el actual).
function restaurarColoniaInput(id) {
  const actual = document.getElementById(id);
  const original = coloniasOriginales.get(id);
  // Si el nodo actual ya no es el select convertido (p.ej. el formulario
  // se reconstruyó), se descarta la referencia vieja.
  if (!actual || actual.tagName !== 'SELECT' || !original) {
    coloniasOriginales.delete(id);
    return actual;
  }
  actual.parentNode.replaceChild(original, actual);
  coloniasOriginales.delete(id);
  return original;
}

// Llena el campo colonia con el listado del código postal:
// - 0 colonias: restaura el input y lo deja vacío (editable).
// - 1 colonia: la autocompleta (es inequívoca) y restaura el input si antes
//   se había convertido a select.
// - 2+ colonias: convierte el input en select para que el usuario elija y lo
//   deja HABILITADO (nunca se guarda una colonia a ciegas). Si ya es select,
//   solo actualiza las opciones.
function llenarColonias(campoColonia, colonias) {
  if (!campoColonia || !Array.isArray(colonias)) return;
  if (colonias.length === 0) {
    const campo = restaurarColoniaInput(campoColonia.id) || campoColonia;
    campo.value = '';
    return;
  }
  if (colonias.length === 1) {
    const campo = restaurarColoniaInput(campoColonia.id) || campoColonia;
    campo.value = colonias[0];
    return;
  }
  const select = convertirColoniaASelect(campoColonia);
  select.innerHTML = colonias.map((c) => `<option value="${c}">${c}</option>`).join('');
  select.selectedIndex = 0;
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
    asignarEstado(campoEstado, datos.estado);
    campoMunicipio.disabled = true;
    campoEstado.disabled = true;

    if (campoColonia) {
      llenarColonias(campoColonia, datos.colonias);
      // La colonia queda HABILITADA: con varias opciones el usuario elige
      // en el select; con una sola queda autocompletada en el input.
      document.getElementById(idColonia).disabled = false;
    }
    if (aviso) aviso.textContent = '';
  } catch (error) {
    campoMunicipio.disabled = false;
    campoEstado.disabled = false;
    if (campoColonia) {
      // Si el campo se había convertido a select en una consulta anterior,
      // se restaura el input original y se deja editable.
      const campo = restaurarColoniaInput(idColonia) || campoColonia;
      campo.value = '';
      campo.disabled = false;
    }
    input.classList.add('invalido');
    if (aviso) aviso.textContent = error.message;
  }
}
