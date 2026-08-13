import pool from '../db.js';
import { registrarBitacora } from '../servicios/bitacoraService.js';

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT cl.id_cliente, cl.nombre, cl.apellido_paterno, cl.correo, cl.telefono, cl.estatus,
              COUNT(a.id_articulo)::INT AS total_articulos
       FROM clientes cl
       JOIN roles r ON r.id_rol = cl.id_rol
       LEFT JOIN articulos a ON a.id_vendedor = cl.id_cliente
       WHERE r.nombre_rol = 'vendedor'
       GROUP BY cl.id_cliente, cl.nombre, cl.apellido_paterno, cl.correo, cl.telefono, cl.estatus
       ORDER BY cl.id_cliente`
    );
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'ver_vendedores',
      entidad: 'vendedor',
      detalle: { total: resultado.rows.length },
      ip: req.ip,
    });
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function articulosDeVendedor(req, res) {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `SELECT a.id_articulo, a.nombre, a.descripcion, a.precio_mxn, a.existencias, a.estatus,
              a.fecha_registro, c.nombre AS categoria
       FROM articulos a
       JOIN categorias c ON c.id_categoria = a.id_categoria
       WHERE a.id_vendedor = $1
       ORDER BY a.id_articulo`,
      [id]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
