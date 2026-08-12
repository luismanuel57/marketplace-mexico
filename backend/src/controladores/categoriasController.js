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

export async function desactivar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      'UPDATE categorias SET estatus = $2 WHERE id_categoria = $1 RETURNING id_categoria, nombre, estatus',
      [id, 'inactivo']
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ mensaje: 'Categoría desactivada', categoria: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
