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

function llenarEstadosDesde(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;
  select.innerHTML = `<option value="">Selecciona un estado...</option>` +
    ESTADOS_MEXICO.map((e) => `<option value="${e}">${e}</option>`).join('');
}

async function autocompletarCodigoPostalDesde(input, idMunicipio, idEstado) {
  const codigo = input.value.trim();
  if (!/^\d{5}$/.test(codigo)) return;

  const campoMunicipio = document.getElementById(idMunicipio);
  const campoEstado = document.getElementById(idEstado);
  const aviso = document.getElementById('aviso-cp');

  input.classList.remove('invalido');
  campoMunicipio.disabled = true;
  campoEstado.disabled = true;
  if (aviso) aviso.textContent = 'Buscando código postal...';

  try {
    const respuesta = await fetch(`${URL_CODIGOS_POSTALES}${codigo}`);
    if (!respuesta.ok) throw new Error('Código postal no encontrado');
    const datos = await respuesta.json();
    if (!datos.estado || !datos.municipio) throw new Error('Código postal no encontrado');

    campoMunicipio.value = datos.municipio;
    campoEstado.value = datos.estado;
    campoMunicipio.disabled = true;
    campoEstado.disabled = true;
    if (aviso) aviso.textContent = '';
  } catch (error) {
    campoMunicipio.disabled = false;
    campoEstado.disabled = false;
    input.classList.add('invalido');
    if (aviso) aviso.textContent = error.message;
  }
}
