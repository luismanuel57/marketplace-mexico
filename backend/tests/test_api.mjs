const BASE = 'http://localhost:3000/api';

let pasos = 0, fallos = 0;

async function peticion(metodo, ruta, cuerpo, token) {
  const opciones = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);
  if (token) opciones.headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${ruta}`, opciones);
  const datos = await res.json().catch(() => ({}));
  return { status: res.status, datos };
}

function informar(nombre, resultado, esperado) {
  const ok = resultado.status === esperado;
  pasos++;
  if (!ok) fallos++;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${resultado.status}] ${nombre}`);
  if (!ok) console.log('     ->', JSON.stringify(resultado.datos));
}

const r1 = await peticion('GET', '/estado');
informar('GET /api/estado', r1, 200);

const r2 = await peticion('GET', '/articulos');
informar('GET /api/articulos (catálogo)', r2, 200);
console.log('     -> total productos:', r2.datos.length);

const r3 = await peticion('GET', '/articulos?q=laptop');
informar('GET /api/articulos?q=laptop', r3, 200);
console.log('     -> resultados:', r3.datos.length);

const r4 = await peticion('GET', '/articulos?categoria=Computaci%C3%B3n&precio_min=300&precio_max=15000&disponible=true');
informar('GET filtros combinados (cat+precio+disponible)', r4, 200);
console.log('     -> resultados:', r4.datos.length);

const r5 = await peticion('GET', '/articulos/1');
informar('GET /api/articulos/1 (detalle)', r5, 200);

const r6 = await peticion('GET', '/categorias');
informar('GET /api/categorias', r6, 200);

// Contrato del autocompletado de código postal (ruta pública).
const cpInvalido = await peticion('GET', '/domicilios/consulta-cp/1234');
informar('GET /api/domicilios/consulta-cp/1234 (formato inválido) -> 400', cpInvalido, 400);

const cpInexistente = await peticion('GET', '/domicilios/consulta-cp/00000');
informar('GET /api/domicilios/consulta-cp/00000 (no existe) -> 404', cpInexistente, 404);

const cpValido = await peticion('GET', '/domicilios/consulta-cp/45040');
informar('GET /api/domicilios/consulta-cp/45040 (Zapopan, Jalisco)', cpValido, 200);
{
  const { estado, municipio, colonias } = cpValido.datos;
  const completo = estado && municipio && Array.isArray(colonias) && colonias.length > 0;
  pasos++;
  if (!completo) fallos++;
  console.log(`${completo ? 'PASS' : 'FAIL'} [${cpValido.status}] consulta-cp/45040 devuelve estado, municipio y colonias`);
  if (!completo) console.log('     ->', JSON.stringify(cpValido.datos));
  console.log('     -> estado:', estado, '| municipio:', municipio, '| colonias:', colonias.length);
}

const login = await peticion('POST', '/auth/login', { correo: 'comprador@tianguisdigital.mx', contrasena: '12345' });
informar('POST /api/auth/login (comprador)', login, 200);
const tokenComprador = login.datos.token;

const loginMal = await peticion('POST', '/auth/login', { correo: 'comprador@tianguisdigital.mx', contrasena: 'incorrecta' });
informar('Login con contraseña incorrecta -> 401', loginMal, 401);

const correoPrueba = `prueba${Date.now()}@test.mx`;
const registro = await peticion('POST', '/auth/registro', { nombre: 'Prueba', apellido_paterno: 'Test', correo: correoPrueba, contrasena: 'secreto123' });
informar('POST /api/auth/registro', registro, 201);

const registroDup = await peticion('POST', '/auth/registro', { nombre: 'X', apellido_paterno: 'Y', correo: correoPrueba, contrasena: 'secreto123' });
informar('Registro con correo duplicado -> 409', registroDup, 409);

const bolsa = await peticion('GET', '/bolsa', null, tokenComprador);
informar('GET /api/bolsa', bolsa, 200);

const agregar = await peticion('POST', '/bolsa', { id_articulo: 1, cantidad: 1 }, tokenComprador);
informar('POST /api/bolsa (agregar producto)', agregar, 201);

const bolsa2 = await peticion('GET', '/bolsa', null, tokenComprador);
informar('GET /api/bolsa (con producto)', bolsa2, 200);
console.log('     -> subtotal:', bolsa2.datos.subtotal);
const idDetalle = bolsa2.datos.articulos.find((a) => a.id_articulo === 1).id_detalle;

const actualizar = await peticion('PUT', `/bolsa/articulos/${idDetalle}`, { cantidad: 3 }, tokenComprador);
informar('PUT /bolsa/articulos/:id (cantidad)', actualizar, 200);

// --- Categorías: endpoints nuevos, guardas y validaciones (R3-004/R3-005) ---
// Este bloque corre ANTES del bloque de órdenes a propósito: el suite tiene un
// fallo pre-existente por drift de stock en POST /ordenes que aborta lo que
// venga después. El login de admin se repite aquí para no depender de eso.
const adminCat = await peticion('POST', '/auth/login', { correo: 'admin@tianguisdigital.mx', contrasena: '12345' });
const tokenAdminCat = adminCat.datos.token;

const todasSinToken = await peticion('GET', '/categorias/todas');
informar('GET /categorias/todas sin token -> 401', todasSinToken, 401);

const todasConComprador = await peticion('GET', '/categorias/todas', null, tokenComprador);
informar('GET /categorias/todas con comprador -> 403', todasConComprador, 403);

const todasConAdmin = await peticion('GET', '/categorias/todas', null, tokenAdminCat);
informar('GET /categorias/todas con admin -> 200', todasConAdmin, 200);
{
  // Orden: ninguna inactiva puede aparecer antes de una activa (R3-001).
  let viInactiva = false;
  let ordenOk = true;
  for (const c of todasConAdmin.datos) {
    if (c.estatus === 'inactivo') viInactiva = true;
    if (viInactiva && c.estatus === 'activo') { ordenOk = false; break; }
  }
  pasos++;
  if (!ordenOk) fallos++;
  console.log(`${ordenOk ? 'PASS' : 'FAIL'} [${todasConAdmin.status}] categorias/todas ordena activas primero`);
  if (!ordenOk) console.log('     ->', JSON.stringify(todasConAdmin.datos.map((c) => c.estatus)));
}

const estatusInvalido = await peticion('PATCH', '/categorias/1/estatus', { estatus: 'fantasma' }, tokenAdminCat);
informar('PATCH /categorias/:id/estatus con estatus inválido -> 400', estatusInvalido, 400);

const patchIdNoNumerico = await peticion('PATCH', '/categorias/abc/estatus', { estatus: 'inactivo' }, tokenAdminCat);
informar('PATCH /categorias/abc/estatus -> 404 (no 500)', patchIdNoNumerico, 404);

const deleteIdNoNumerico = await peticion('DELETE', '/categorias/abc', null, tokenAdminCat);
informar('DELETE /categorias/abc -> 404 (no 500)', deleteIdNoNumerico, 404);

const patchInexistente = await peticion('PATCH', '/categorias/99999999/estatus', { estatus: 'activo' }, tokenAdminCat);
informar('PATCH /categorias/:id/estatus con id inexistente -> 404', patchInexistente, 404);

// Categoría temporal para probar estatus y borrado sin tocar el catálogo real.
const nombreTemp = `Test ${Date.now()}`;
const crearTemp = await peticion('POST', '/categorias', { nombre: nombreTemp, descripcion: 'Temporal para tests' }, tokenAdminCat);
informar('POST /categorias (temporal)', crearTemp, 201);
const idTemp = crearTemp.datos.categoria?.id_categoria;

const desactivarTemp = await peticion('PATCH', `/categorias/${idTemp}/estatus`, { estatus: 'inactivo' }, tokenAdminCat);
informar('PATCH /categorias/:id/estatus (inactivo) -> 200', desactivarTemp, 200);

const publicas = await peticion('GET', '/categorias');
{
  const oculta = !publicas.datos.some((c) => c.id_categoria === idTemp);
  pasos++;
  if (!oculta) fallos++;
  console.log(`${oculta ? 'PASS' : 'FAIL'} [${publicas.status}] categoría inactiva no aparece en GET /categorias`);
  if (!oculta) console.log('     ->', JSON.stringify(publicas.datos.map((c) => c.id_categoria)));
}

// DELETE sobre una categoría con artículos -> 409 (guard del borrado físico).
{
  const articulos = await peticion('GET', '/articulos');
  const conArticulos = articulos.datos[0]?.categoria;
  const objetivo = todasConAdmin.datos.find((c) => c.nombre === conArticulos);
  if (objetivo) {
    const deleteConArticulos = await peticion('DELETE', `/categorias/${objetivo.id_categoria}`, null, tokenAdminCat);
    informar('DELETE /categorias/:id con artículos -> 409', deleteConArticulos, 409);
  } else {
    console.log('SKIP [sin artículos activos] DELETE con artículos -> 409');
  }
}

const borrarTemp = await peticion('DELETE', `/categorias/${idTemp}`, null, tokenAdminCat);
informar('DELETE /categorias/:id sin artículos -> 200', borrarTemp, 200);

{
  const trasBorrado = await peticion('GET', '/categorias/todas', null, tokenAdminCat);
  const desaparecio = !trasBorrado.datos.some((c) => c.id_categoria === idTemp);
  pasos++;
  if (!desaparecio) fallos++;
  console.log(`${desaparecio ? 'PASS' : 'FAIL'} [${trasBorrado.status}] la categoría temporal fue eliminada`);
  if (!desaparecio) console.log('     ->', JSON.stringify(trasBorrado.datos.map((c) => c.nombre)));
}

const domicilio = await peticion('POST', '/domicilios', { nombre: 'Prueba Test', calle: 'Calle 1', numero: '10', colonia: 'Centro', codigo_postal: '44100', municipio: 'Guadalajara', estado: 'Jalisco' }, tokenComprador);
informar('POST /api/domicilios', domicilio, 201);

const orden = await peticion('POST', '/ordenes', { id_domicilio: domicilio.datos.domicilio.id_domicilio }, tokenComprador);
informar('POST /api/ordenes (generar pedido)', orden, 201);
console.log('     -> folio:', orden.datos.orden?.folio_orden, '| total:', orden.datos.orden?.total);

const misOrdenes = await peticion('GET', '/ordenes', null, tokenComprador);
informar('GET /api/ordenes (mis pedidos)', misOrdenes, 200);

const todas403 = await peticion('GET', '/ordenes/todas', null, tokenComprador);
informar('GET /ordenes/todas con cliente -> 403', todas403, 403);

const admin = await peticion('POST', '/auth/login', { correo: 'admin@tianguisdigital.mx', contrasena: '12345' });
informar('POST /api/auth/login (admin)', admin, 200);
const tokenAdmin = admin.datos.token;

const cambioEstado = await peticion('PUT', `/ordenes/${orden.datos.orden.id_orden}/estado`, { estado: 'confirmado' }, tokenAdmin);
informar('PUT /ordenes/:id/estado (admin)', cambioEstado, 200);

const todas = await peticion('GET', '/ordenes/todas', null, tokenAdmin);
informar('GET /ordenes/todas (admin)', todas, 200);

const clientes = await peticion('GET', '/clientes', null, tokenAdmin);
informar('GET /api/clientes (admin)', clientes, 200);

const nuevoArticulo = await peticion('POST', '/articulos', { id_categoria: 1, nombre: 'Producto de prueba', precio_mxn: 500, existencias: 10 }, tokenAdmin);
informar('POST /api/articulos (admin crear)', nuevoArticulo, 201);
const idArticuloNuevo = nuevoArticulo.datos.articulo.id_articulo;

const modificarArt = await peticion('PUT', `/articulos/${idArticuloNuevo}`, { precio_mxn: 550 }, tokenAdmin);
informar('PUT /api/articulos/:id (admin modificar)', modificarArt, 200);

const desactivarArt = await peticion('DELETE', `/articulos/${idArticuloNuevo}`, null, tokenAdmin);
informar('DELETE /api/articulos/:id (desactivar)', desactivarArt, 200);

const sinToken = await peticion('POST', '/articulos', { id_categoria: 1, nombre: 'X', precio_mxn: 1 });
informar('POST /articulos sin token -> 401', sinToken, 401);

const clienteAccedeAdmin = await peticion('GET', '/clientes', null, tokenComprador);
informar('GET /clientes con cliente -> 403', clienteAccedeAdmin, 403);

const precioNegativo = await peticion('POST', '/articulos', { id_categoria: 1, nombre: 'X', precio_mxn: -5 }, tokenAdmin);
informar('Precio negativo -> 400', precioNegativo, 400);

console.log(`\nRESULTADO: ${pasos - fallos}/${pasos} correctos, ${fallos} fallos`);
