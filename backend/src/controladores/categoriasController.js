import pool from '../db.js';
import { registrarBitacora } from '../servicios/bitacoraService.js';
import { asegurarCarpetaCategoria } from '../servicios/driveService.js';

// El id de ruta debe ser numérico: un valor como "abc" haría que PostgreSQL
// dispare el error 22P02 (invalid input syntax for type integer) y terminaría
// en un 500. Se valida antes de tocar la BD.
function idValido(id) {
  return /^\d+$/.test(id ?? '');
}

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      "SELECT * FROM categorias WHERE estatus = 'activo' ORDER BY nombre"
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listar categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Todas las categorías (activas e inactivas) para el panel de administración.
// Orden: activas primero, luego por nombre.
export async function listarTodas(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT * FROM categorias
       ORDER BY (estatus = 'activo') DESC, nombre`
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error en listar todas las categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, descripcion } = req.body;
    // El trim evita que '   ' pase la validación de obligatorio.
    const nombreLimpio = (nombre ?? '').trim();
    if (!nombreLimpio) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    // La descripción es VARCHAR(200): se trunca para no disparar el 22001.
    const descripcionLimpia = (descripcion ?? '').trim().slice(0, 200) || null;
    const resultado = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombreLimpio, descripcionLimpia]
    );
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'crear_categoria',
      entidad: 'categoria',
      id_entidad: resultado.rows[0].id_categoria,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });
    // La carpeta de Drive se crea justo después del INSERT: el 201 se responde
    // igual aunque Drive falle (la categoría no depende de Drive). El nombre
    // usado es el mismo nombreLimpio validado y trimeado que se insertó.
    let avisoDrive = null;
    try {
      await asegurarCarpetaCategoria(nombreLimpio);
    } catch (error) {
      avisoDrive = 'No se pudo crear la carpeta en Google Drive: ' + error.message;
      console.error('Error al crear carpeta de categoría en Drive:', error.message);
    }
    res.status(201).json({
      mensaje: 'Categoría creada',
      categoria: resultado.rows[0],
      aviso_drive: avisoDrive,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'La categoría ya existe' });
    }
    console.error('Error en crear categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function modificar(req, res) {
  try {
    const { id } = req.params;
    let { nombre, descripcion } = req.body;
    if (!idValido(id)) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    // Si el nombre viene en el body debe quedar no vacío tras el trim; si no
    // viene (undefined/null), COALESCE conserva el valor actual.
    if (nombre !== undefined && nombre !== null) {
      const nombreLimpio = String(nombre).trim();
      if (!nombreLimpio) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
      }
      nombre = nombreLimpio;
    }
    if (descripcion !== undefined && descripcion !== null) {
      descripcion = String(descripcion).trim().slice(0, 200) || null;
    }
    const resultado = await pool.query(
      `UPDATE categorias SET nombre = COALESCE($2, nombre), descripcion = COALESCE($3, descripcion)
       WHERE id_categoria = $1 RETURNING *`,
      [id, nombre, descripcion]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'modificar_categoria',
      entidad: 'categoria',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });
    res.json({ mensaje: 'Categoría actualizada', categoria: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'La categoría ya existe' });
    }
    console.error('Error en modificar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Activa o desactiva una categoría. Sustituye al antiguo desactivar:
// el desactivado ahora es un cambio de estatus explícito vía PATCH.
export async function cambiarEstatus(req, res) {
  try {
    const { id } = req.params;
    const { estatus } = req.body;
    if (!idValido(id)) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    if (!['activo', 'inactivo'].includes(estatus)) {
      return res.status(400).json({ error: 'El estatus debe ser activo o inactivo' });
    }
    const resultado = await pool.query(
      'UPDATE categorias SET estatus = $2 WHERE id_categoria = $1 RETURNING id_categoria, nombre, estatus',
      [id, estatus]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'cambiar_estatus_categoria',
      entidad: 'categoria',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre, estatus },
      ip: req.ip,
    });
    res.json({
      mensaje: estatus === 'activo' ? 'Categoría activada' : 'Categoría desactivada',
      categoria: resultado.rows[0],
    });
  } catch (error) {
    console.error('Error en cambiar estatus de categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Borrado físico: solo se permite cuando la categoría no tiene artículos asociados.
// El DELETE es atómico (la misma sentencia verifica que no haya artículos) para
// cerrar la ventana TOCTOU entre el chequeo previo y el borrado.
export async function eliminar(req, res) {
  try {
    const { id } = req.params;
    if (!idValido(id)) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const resultado = await pool.query(
      `DELETE FROM categorias
       WHERE id_categoria = $1
         AND NOT EXISTS (SELECT 1 FROM articulos WHERE id_categoria = $1)
       RETURNING id_categoria, nombre`,
      [id]
    );
    if (resultado.rows.length === 0) {
      // El DELETE no borró nada: la categoría no existe o tiene artículos.
      // Solo en este caso se consulta la existencia para decidir 404 vs 409.
      const existe = await pool.query('SELECT 1 FROM categorias WHERE id_categoria = $1', [id]);
      if (existe.rows.length === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
      return res.status(409).json({
        error: 'No se puede eliminar: la categoría tiene artículos asociados. Desactívala en su lugar.',
      });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'eliminar_categoria',
      entidad: 'categoria',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    // Carrera residual: un INSERT de artículo que commitea justo después del
    // NOT EXISTS puede disparar la FK 23503 antes de que commitee el DELETE.
    if (error.code === '23503') {
      return res.status(409).json({
        error: 'No se puede eliminar: la categoría tiene artículos asociados. Desactívala en su lugar.',
      });
    }
    console.error('Error en eliminar categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
