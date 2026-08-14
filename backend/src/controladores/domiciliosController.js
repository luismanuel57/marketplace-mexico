import pool from '../db.js';

const API_POSTAL_EXTERNA = 'https://postali.app/api/v1/mx/cp/';
const TIMEOUT_API_POSTAL_MS = 4000;

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT * FROM domicilios WHERE id_cliente = $1 ORDER BY id_domicilio',
      [req.cliente.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, calle, numero, colonia, codigo_postal, municipio, estado, telefono_contacto } = req.body;

    if (!calle || !colonia || !codigo_postal || !municipio || !estado) {
      return res.status(400).json({ error: 'calle, colonia, codigo_postal, municipio y estado son obligatorios' });
    }
    if (!/^\d{5}$/.test(codigo_postal)) {
      return res.status(400).json({ error: 'Código postal inválido (deben ser 5 dígitos)' });
    }

    const resultado = await pool.query(
      `INSERT INTO domicilios (id_cliente, nombre, calle, numero, colonia, codigo_postal, municipio, estado, telefono_contacto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.cliente.id, nombre || null, calle, numero || null, colonia, codigo_postal, municipio, estado, telefono_contacto || null]
    );

    res.status(201).json({ mensaje: 'Dirección registrada', domicilio: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Consulta híbrida de código postal: primero intenta la API en vivo
// (postali.app) con timeout de 4 s y, si falla, cae al catálogo local
// cargado en codigos_postales (fuente SEPOMEX).
export async function consultarCodigoPostal(req, res) {
  const { cp } = req.params;

  if (!/^\d{5}$/.test(cp)) {
    return res.status(400).json({ error: 'Código postal inválido (deben ser 5 dígitos)' });
  }

  // Paso 1: API en vivo. Cualquier fallo (red, timeout, HTTP no 200,
  // campos faltantes) pasa silenciosamente al paso 2.
  const datosApi = await consultarApiExterna(cp);
  if (datosApi) return res.json(datosApi);

  // Paso 2: catálogo local (respaldo).
  try {
    const [resultadoUbicacion, resultadoColonias] = await Promise.all([
      pool.query(
        'SELECT DISTINCT municipio, estado FROM codigos_postales WHERE cp = $1 LIMIT 1',
        [cp]
      ),
      pool.query(
        'SELECT DISTINCT colonia FROM codigos_postales WHERE cp = $1 ORDER BY colonia',
        [cp]
      ),
    ]);

    const ubicacion = resultadoUbicacion.rows[0];
    if (!ubicacion) {
      return res.status(404).json({ error: 'Código postal no encontrado' });
    }

    return res.json({
      fuente: 'bd',
      cp,
      estado: ubicacion.estado,
      municipio: ubicacion.municipio,
      colonias: resultadoColonias.rows.map((fila) => fila.colonia),
    });
  } catch (error) {
    // Solo llega aquí si el respaldo local falla por base de datos. La ruta
    // es pública: se registra el detalle real pero la respuesta es genérica
    // para no filtrar detalles internos (tablas, columnas, conexión).
    console.error(`Error al consultar el catálogo local de códigos postales: ${error.message}`);
    return res.status(500).json({ error: 'No se pudo consultar el código postal' });
  }
}

async function consultarApiExterna(cp) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_API_POSTAL_MS);
  try {
    const respuesta = await fetch(`${API_POSTAL_EXTERNA}${cp}`, {
      signal: controlador.signal,
    });
    if (respuesta.status === 200) {
      const cuerpo = await respuesta.json();
      if (cuerpo.estado && cuerpo.municipio) {
        return {
          fuente: 'api',
          cp,
          estado: cuerpo.estado,
          municipio: cuerpo.municipio,
          colonias: Array.isArray(cuerpo.asentamientos)
            ? cuerpo.asentamientos.map((asentamiento) => asentamiento.nombre)
            : [],
        };
      }
    }
    return null;
  } catch {
    // Red caída o timeout: se usa el catálogo local.
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
