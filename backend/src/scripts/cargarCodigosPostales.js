#!/usr/bin/env node
// ============================================================
// Tianguis Digital - Carga del catálogo SEPOMEX de códigos postales
//
// Descarga los 32 CSVs del repositorio ASJordi/codigos-postales-mx
// y los inserta en la tabla codigos_postales en lotes de 1000.
//
// Uso (desde la raíz del proyecto):
//   node backend/src/scripts/cargarCodigosPostales.js
//
// Formato de cada línea del CSV (delimitado por |, sin encabezado):
//   d_codigo|d_asenta|d_tipo_asenta|d_mnpio|d_estado|d_ciudad|...
//   (se usan los campos 1..6, índices 0..5)
//
// La lista de archivos se verificó contra la API de GitHub
// (git/trees/main?recursive=1, filtrando *.csv) y se codificó para
// no depender de límites de peticiones en tiempo de ejecución.
// ============================================================

import pg from 'pg';

const { Client } = pg;

const BASE_RAW =
  'https://raw.githubusercontent.com/ASJordi/codigos-postales-mx/main/src/main/resources/data/';

// Los 32 estados (archivos verificados en el repositorio).
const ARCHIVOS = [
  'aguascalientes.csv',
  'baja_california.csv',
  'baja_california_sur.csv',
  'campeche.csv',
  'chiapas.csv',
  'chihuahua.csv',
  'coahuila_de_zaragoza.csv',
  'colima.csv',
  'distrito_federal.csv',
  'durango.csv',
  'guanajuato.csv',
  'guerrero.csv',
  'hidalgo.csv',
  'jalisco.csv',
  'mexico.csv',
  'michoacan_de_ocampo.csv',
  'morelos.csv',
  'nayarit.csv',
  'nuevo_leon.csv',
  'oaxaca.csv',
  'puebla.csv',
  'queretaro.csv',
  'quintana_roo.csv',
  'san_luis_potosi.csv',
  'sinaloa.csv',
  'sonora.csv',
  'tabasco.csv',
  'tamaulipas.csv',
  'tlaxcala.csv',
  'veracruz_de_ignacio_de_la_llave.csv',
  'yucatan.csv',
  'zacatecas.csv',
];

const TAMANO_LOTE = 1000;

const cliente = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'tianguis_digital',
  user: process.env.DB_USER || 'tianguis',
  password: process.env.DB_PASSWORD || 'tianguis123',
});

// Convierte una línea del CSV en una fila, o null si no es válida.
function parsearLinea(linea) {
  const campos = linea.split('|');
  // El catálogo SEPOMEX trae 14 campos; se descartan líneas truncadas.
  if (campos.length < 13) return null;

  const cp = campos[0].trim();
  const colonia = campos[1].trim();
  const tipo_colonia = campos[2].trim() || null;
  const municipio = campos[3].trim();
  const estado = campos[4].trim();
  const ciudad = campos[5].trim() || null;

  if (!/^\d{5}$/.test(cp) || !colonia || !municipio || !estado) return null;
  return { cp, colonia, tipo_colonia, municipio, estado, ciudad };
}

async function descargarLineas(nombreArchivo) {
  const respuesta = await fetch(`${BASE_RAW}${nombreArchivo}`);
  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status} al descargar ${nombreArchivo}`);
  }
  const buffer = await respuesta.arrayBuffer();
  // El catálogo SEPOMEX viene en ISO-8859-1 (Latin-1); si un archivo
  // resultara ser UTF-8 válido se respeta con TextDecoder fatal.
  let contenido;
  try {
    contenido = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    contenido = new TextDecoder('latin1').decode(buffer);
  }
  return contenido.split(/\r?\n/);
}

// Inserta un lote con INSERT múltiple y ON CONFLICT DO NOTHING
// (aprovecha la restricción UNIQUE (cp, colonia, municipio)).
async function insertarLote(filas) {
  const valores = [];
  const grupos = [];
  filas.forEach((fila, i) => {
    const base = i * 6;
    grupos.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
    );
    valores.push(fila.cp, fila.colonia, fila.tipo_colonia, fila.municipio, fila.estado, fila.ciudad);
  });
  const sql = `
    INSERT INTO codigos_postales (cp, colonia, tipo_colonia, municipio, estado, ciudad)
    VALUES ${grupos.join(', ')}
    ON CONFLICT DO NOTHING`;
  const resultado = await cliente.query(sql, valores);
  return resultado.rowCount;
}

async function procesarArchivo(nombreArchivo) {
  const lineas = await descargarLineas(nombreArchivo);
  const filas = lineas.map(parsearLinea).filter(Boolean);

  let insertadas = 0;
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    const lote = filas.slice(i, i + TAMANO_LOTE);
    insertadas += await insertarLote(lote);
  }

  console.log(
    `${nombreArchivo}: ${filas.length} filas leídas, ${insertadas} insertadas`
  );
  return insertadas;
}

try {
  await cliente.connect();
  console.log(`Cargando ${ARCHIVOS.length} archivos del catálogo SEPOMEX...`);

  let total = 0;
  for (const archivo of ARCHIVOS) {
    total += await procesarArchivo(archivo);
  }

  const conteo = await cliente.query('SELECT COUNT(*) AS total FROM codigos_postales');
  console.log(`\nTotal insertadas: ${total}`);
  console.log(`Total en codigos_postales: ${conteo.rows[0].total}`);
} catch (error) {
  console.error('Error durante la carga:', error.message);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
