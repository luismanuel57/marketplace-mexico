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
