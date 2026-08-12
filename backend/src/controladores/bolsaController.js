import pool from '../db.js';

async function obtenerBolsaAbierta(idCliente) {
  const resultado = await pool.query(
    "SELECT id_bolsa FROM bolsa WHERE id_cliente = $1 AND estatus = 'abierta'",
    [idCliente]
  );
  return resultado.rows[0] || null;
}

async function crearBolsa(idCliente) {
  const resultado = await pool.query(
    'INSERT INTO bolsa (id_cliente) VALUES ($1) RETURNING id_bolsa',
    [idCliente]
  );
  return resultado.rows[0];
}

async function detallePerteneceAlCliente(idCliente, idDetalle) {
  const resultado = await pool.query(
    `SELECT bd.id_detalle
     FROM bolsa_detalle bd
     JOIN bolsa b ON b.id_bolsa = bd.id_bolsa
     WHERE bd.id_detalle = $1 AND b.id_cliente = $2 AND b.estatus = 'abierta'`,
    [idDetalle, idCliente]
  );
  return resultado.rows.length > 0;
}

export async function ver(req, res) {
  try {
    const idCliente = req.cliente.id;

    let bolsa = await obtenerBolsaAbierta(idCliente);
    if (!bolsa) {
      bolsa = await crearBolsa(idCliente);
    }

    const detalle = await pool.query(
      `SELECT bd.id_detalle, a.id_articulo, a.nombre, a.imagen_url, bd.cantidad,
              bd.precio_unitario, (bd.cantidad * bd.precio_unitario) AS subtotal_linea,
              a.existencias
       FROM bolsa_detalle bd
       JOIN articulos a ON a.id_articulo = bd.id_articulo
       WHERE bd.id_bolsa = $1`,
      [bolsa.id_bolsa]
    );

    const subtotal = detalle.rows.reduce((s, fila) => s + Number(fila.subtotal_linea), 0);
    res.json({ id_bolsa: bolsa.id_bolsa, subtotal, articulos: detalle.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function agregar(req, res) {
  try {
    const idCliente = req.cliente.id;
    const { id_articulo, cantidad } = req.body;

    if (!id_articulo || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'id_articulo y cantidad (> 0) son obligatorios' });
    }

    const articulo = await pool.query(
      "SELECT id_articulo, precio_mxn, existencias FROM articulos WHERE id_articulo = $1 AND estatus = 'activo'",
      [id_articulo]
    );
    if (articulo.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no disponible' });
    }
    if (articulo.rows[0].existencias < cantidad) {
      return res.status(400).json({ error: 'No hay suficientes existencias' });
    }

    let bolsa = await obtenerBolsaAbierta(idCliente);
    if (!bolsa) {
      bolsa = await crearBolsa(idCliente);
    }

    const resultado = await pool.query(
      `INSERT INTO bolsa_detalle (id_bolsa, id_articulo, cantidad, precio_unitario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id_bolsa, id_articulo)
       DO UPDATE SET cantidad = bolsa_detalle.cantidad + EXCLUDED.cantidad
       RETURNING *`,
      [bolsa.id_bolsa, id_articulo, cantidad, articulo.rows[0].precio_mxn]
    );

    res.status(201).json({ mensaje: 'Producto agregado a la bolsa', detalle: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function actualizarCantidad(req, res) {
  try {
    const idCliente = req.cliente.id;
    const { idDetalle } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
    }
    if (!(await detallePerteneceAlCliente(idCliente, idDetalle))) {
      return res.status(404).json({ error: 'Detalle no encontrado en tu bolsa' });
    }

    const resultado = await pool.query(
      'UPDATE bolsa_detalle SET cantidad = $2 WHERE id_detalle = $1 RETURNING *',
      [idDetalle, cantidad]
    );
    res.json({ mensaje: 'Cantidad actualizada', detalle: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function eliminar(req, res) {
  try {
    const idCliente = req.cliente.id;
    const { idDetalle } = req.params;

    if (!(await detallePerteneceAlCliente(idCliente, idDetalle))) {
      return res.status(404).json({ error: 'Detalle no encontrado en tu bolsa' });
    }

    await pool.query('DELETE FROM bolsa_detalle WHERE id_detalle = $1', [idDetalle]);
    res.json({ mensaje: 'Producto eliminado de la bolsa' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
