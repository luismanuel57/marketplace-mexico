import pool from '../db.js';

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      "SELECT * FROM categorias WHERE estatus = 'activo' ORDER BY nombre"
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Todas las categorías (activas e inactivas) para el panel de administración.
// Orden: activas primero, luego por nombre.
export async function listarTodas(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT * FROM categorias ORDER BY estatus DESC, nombre'
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const resultado = await pool.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion || null]
    );
    res.status(201).json({ mensaje: 'Categoría creada', categoria: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'La categoría ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    const resultado = await pool.query(
      `UPDATE categorias SET nombre = COALESCE($2, nombre), descripcion = COALESCE($3, descripcion)
       WHERE id_categoria = $1 RETURNING *`,
      [id, nombre, descripcion]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ mensaje: 'Categoría actualizada', categoria: resultado.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'La categoría ya existe' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Activa o desactiva una categoría. Sustituye al antiguo desactivar:
// el desactivado ahora es un cambio de estatus explícito vía PATCH.
export async function cambiarEstatus(req, res) {
  try {
    const { id } = req.params;
    const { estatus } = req.body;
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
    res.json({
      mensaje: estatus === 'activo' ? 'Categoría activada' : 'Categoría desactivada',
      categoria: resultado.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Borrado físico: solo se permite cuando la categoría no tiene artículos asociados.
export async function eliminar(req, res) {
  try {
    const { id } = req.params;
    const existe = await pool.query('SELECT 1 FROM categorias WHERE id_categoria = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    const conArticulos = await pool.query(
      'SELECT 1 FROM articulos WHERE id_categoria = $1 LIMIT 1',
      [id]
    );
    if (conArticulos.rows.length > 0) {
      return res.status(409).json({
        error: 'No se puede eliminar: la categoría tiene artículos asociados. Desactívala en su lugar.',
      });
    }
    await pool.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
