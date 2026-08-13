import pool from '../db.js';

export async function listar(req, res) {
  try {
    const { correo, accion, desde, hasta, limite } = req.query;
    const condiciones = [];
    const valores = [];
    let siguiente = 1;

    if (correo) {
      condiciones.push(`b.correo ILIKE $${siguiente++}`);
      valores.push(`%${correo}%`);
    }
    if (accion) {
      condiciones.push(`b.accion = $${siguiente++}`);
      valores.push(accion);
    }
    if (desde) {
      condiciones.push(`b.fecha >= $${siguiente++}::timestamptz`);
      valores.push(desde);
    }
    if (hasta) {
      condiciones.push(`b.fecha <= $${siguiente++}::timestamptz`);
      valores.push(hasta);
    }

    const maxLimite = Math.min(Math.max(Number(limite) || 100, 1), 500);
    const donde = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const resultado = await pool.query(
      `SELECT b.id_bitacora, b.id_cliente, b.correo, b.accion, b.entidad, b.id_entidad,
              b.detalle, b.ip, b.fecha
       FROM bitacora b
       ${donde}
       ORDER BY b.fecha DESC
       LIMIT $${siguiente}`,
      [...valores, maxLimite]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
