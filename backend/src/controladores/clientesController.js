import pool from '../db.js';

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT cl.id_cliente, cl.nombre, cl.apellido_paterno, cl.apellido_materno, cl.correo,
              cl.telefono, cl.fecha_registro, cl.estatus, r.nombre_rol AS rol
       FROM clientes cl
       JOIN roles r ON r.id_rol = cl.id_rol
       ORDER BY cl.id_cliente`
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
