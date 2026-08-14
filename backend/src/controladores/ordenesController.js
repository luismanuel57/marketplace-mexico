import pool from '../db.js';
import { registrarBitacora } from '../servicios/bitacoraService.js';

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'preparando', 'enviado', 'entregado', 'cancelado'];
const METODOS_PAGO_VALIDOS = ['no_especificado', 'tarjeta_prueba', 'efectivo'];

export async function crear(req, res) {
  try {
    const idCliente = req.cliente.id;
    const { id_domicilio, metodo_pago } = req.body;
    const metodoPago = metodo_pago || 'no_especificado';

    if (!id_domicilio) {
      return res.status(400).json({ error: 'id_domicilio es obligatorio' });
    }

    if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
      return res.status(400).json({ error: `Método de pago inválido. Válidos: ${METODOS_PAGO_VALIDOS.join(', ')}` });
    }

    const domicilio = await pool.query(
      'SELECT id_domicilio FROM domicilios WHERE id_domicilio = $1 AND id_cliente = $2',
      [id_domicilio, idCliente]
    );
    if (domicilio.rows.length === 0) {
      return res.status(400).json({ error: 'La dirección no pertenece al cliente' });
    }

    const bolsa = await pool.query(
      "SELECT id_bolsa FROM bolsa WHERE id_cliente = $1 AND estatus = 'abierta'",
      [idCliente]
    );
    if (bolsa.rows.length === 0) {
      return res.status(400).json({ error: 'La bolsa está vacía o no existe' });
    }
    const idBolsa = bolsa.rows[0].id_bolsa;

    const detalle = await pool.query(
      'SELECT id_articulo, cantidad, precio_unitario FROM bolsa_detalle WHERE id_bolsa = $1',
      [idBolsa]
    );
    if (detalle.rows.length === 0) {
      return res.status(400).json({ error: 'La bolsa está vacía' });
    }

    for (const linea of detalle.rows) {
      const articulo = await pool.query('SELECT existencias FROM articulos WHERE id_articulo = $1', [linea.id_articulo]);
      if (articulo.rows[0].existencias < linea.cantidad) {
        return res.status(400).json({ error: `No hay existencias suficientes del producto #${linea.id_articulo}` });
      }
    }

    const subtotal = detalle.rows.reduce((s, l) => s + Number(l.precio_unitario) * l.cantidad, 0);
    const envio = 199;
    const total = subtotal + envio;
    const folio = `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

    const orden = await pool.query(
      `INSERT INTO ordenes (folio_orden, id_cliente, id_domicilio, subtotal, envio, total, metodo_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [folio, idCliente, id_domicilio, subtotal, envio, total, metodoPago]
    );

    for (const linea of detalle.rows) {
      const subtotalLinea = Number(linea.precio_unitario) * linea.cantidad;
      await pool.query(
        `INSERT INTO orden_detalle (id_orden, id_articulo, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [orden.rows[0].id_orden, linea.id_articulo, linea.cantidad, linea.precio_unitario, subtotalLinea]
      );
      await pool.query('UPDATE articulos SET existencias = existencias - $2 WHERE id_articulo = $1', [linea.id_articulo, linea.cantidad]);
    }

    await pool.query("UPDATE bolsa SET estatus = 'convertida' WHERE id_bolsa = $1", [idBolsa]);

    await registrarBitacora({
      id_cliente: idCliente,
      correo: req.cliente.correo,
      accion: 'generar_orden',
      entidad: 'orden',
      id_entidad: orden.rows[0].id_orden,
      detalle: { folio: orden.rows[0].folio_orden, total: Number(orden.rows[0].total), metodo_pago: metodoPago },
      ip: req.ip,
    });

    res.status(201).json({ mensaje: 'Pedido generado', orden: orden.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listarMios(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT o.id_orden, o.folio_orden, o.fecha_orden, o.subtotal, o.envio, o.total, o.estado
       FROM ordenes o
       WHERE o.id_cliente = $1
       ORDER BY o.fecha_orden DESC`,
      [req.cliente.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function detalle(req, res) {
  try {
    const { id } = req.params;

    // Un comprador solo puede ver sus propias órdenes; el administrador puede ver cualquier orden.
    const esAdmin = req.cliente && req.cliente.rol === 'administrador';
    const consulta = esAdmin
      ? `SELECT o.id_orden, o.folio_orden, o.fecha_orden, o.subtotal, o.envio, o.total, o.estado,
                cl.nombre, cl.apellido_paterno, d.calle, d.numero, d.colonia, d.municipio, d.estado AS estado_domicilio, d.codigo_postal, d.pais
         FROM ordenes o
         JOIN clientes cl ON cl.id_cliente = o.id_cliente
         JOIN domicilios d ON d.id_domicilio = o.id_domicilio
         WHERE o.id_orden = $1`
      : `SELECT o.id_orden, o.folio_orden, o.fecha_orden, o.subtotal, o.envio, o.total, o.estado,
                cl.nombre, cl.apellido_paterno, d.calle, d.numero, d.colonia, d.municipio, d.estado AS estado_domicilio, d.codigo_postal, d.pais
         FROM ordenes o
         JOIN clientes cl ON cl.id_cliente = o.id_cliente
         JOIN domicilios d ON d.id_domicilio = o.id_domicilio
         WHERE o.id_orden = $1 AND o.id_cliente = $2`;
    const orden = await pool.query(consulta, esAdmin ? [id] : [id, req.cliente.id]);
    if (orden.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const items = await pool.query(
      `SELECT od.id_articulo, a.nombre, od.cantidad, od.precio_unitario, od.subtotal
       FROM orden_detalle od
       JOIN articulos a ON a.id_articulo = od.id_articulo
       WHERE od.id_orden = $1`,
      [id]
    );

    res.json({ ...orden.rows[0], articulos: items.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function listarTodos(req, res) {
  try {
    const resultado = await pool.query(
      `SELECT o.id_orden, o.folio_orden, o.fecha_orden, o.total, o.estado,
              cl.nombre || ' ' || cl.apellido_paterno AS cliente
       FROM ordenes o
       JOIN clientes cl ON cl.id_cliente = o.id_cliente
       ORDER BY o.fecha_orden DESC`
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Válidos: ${ESTADOS_VALIDOS.join(', ')}` });
    }

    const resultado = await pool.query(
      'UPDATE ordenes SET estado = $2 WHERE id_orden = $1 RETURNING *',
      [id, estado]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'cambiar_estado_orden',
      entidad: 'orden',
      id_entidad: id,
      detalle: { estado },
      ip: req.ip,
    });
    res.json({ mensaje: 'Estado actualizado', orden: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
