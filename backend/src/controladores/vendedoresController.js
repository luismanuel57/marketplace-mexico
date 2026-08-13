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

// Reporte de ventas del vendedor autenticado (self-service: el id siempre
// sale del token, nunca del cliente). Se agrupa por día (últimos 30 días),
// por semana y top 10 de productos. pg devuelve NUMERIC como string, por eso
// los ingresos se convierten con Number() (mismo patrón que ordenesController).
export async function ventasDeVendedor(req, res) {
  try {
    const idVendedor = req.cliente.id;

    const [info, resumen, porDia, porSemana, topProductos] = await Promise.all([
      pool.query('SELECT id_cliente, nombre, apellido_paterno FROM clientes WHERE id_cliente = $1', [idVendedor]),
      pool.query(
        `SELECT COUNT(DISTINCT o.id_orden)::INT AS total_ordenes,
                COALESCE(SUM(od.cantidad), 0)::INT AS articulos_vendidos,
                COALESCE(SUM(od.subtotal), 0) AS ingresos
         FROM ordenes o
         JOIN orden_detalle od ON od.id_orden = o.id_orden
         JOIN articulos a ON a.id_articulo = od.id_articulo
         WHERE a.id_vendedor = $1 AND o.estado <> 'cancelado'`,
        [idVendedor]
      ),
      pool.query(
        `SELECT to_char(o.fecha_orden::date, 'YYYY-MM-DD') AS dia,
                COUNT(DISTINCT o.id_orden)::INT AS ordenes,
                COALESCE(SUM(od.cantidad), 0)::INT AS articulos,
                COALESCE(SUM(od.subtotal), 0) AS ingresos
         FROM ordenes o
         JOIN orden_detalle od ON od.id_orden = o.id_orden
         JOIN articulos a ON a.id_articulo = od.id_articulo
         WHERE a.id_vendedor = $1 AND o.estado <> 'cancelado' AND o.fecha_orden >= NOW() - INTERVAL '30 days'
         GROUP BY o.fecha_orden::date ORDER BY o.fecha_orden::date DESC`,
        [idVendedor]
      ),
      pool.query(
        `SELECT to_char(date_trunc('week', o.fecha_orden), 'YYYY-MM-DD') AS semana,
                COUNT(DISTINCT o.id_orden)::INT AS ordenes,
                COALESCE(SUM(od.cantidad), 0)::INT AS articulos,
                COALESCE(SUM(od.subtotal), 0) AS ingresos
         FROM ordenes o
         JOIN orden_detalle od ON od.id_orden = o.id_orden
         JOIN articulos a ON a.id_articulo = od.id_articulo
         WHERE a.id_vendedor = $1 AND o.estado <> 'cancelado'
         GROUP BY date_trunc('week', o.fecha_orden) ORDER BY date_trunc('week', o.fecha_orden) DESC`,
        [idVendedor]
      ),
      pool.query(
        `SELECT a.id_articulo, a.nombre,
                COUNT(DISTINCT o.id_orden)::INT AS pedidos,
                SUM(od.cantidad)::INT AS unidades,
                SUM(od.subtotal) AS ingresos
         FROM ordenes o
         JOIN orden_detalle od ON od.id_orden = o.id_orden
         JOIN articulos a ON a.id_articulo = od.id_articulo
         WHERE a.id_vendedor = $1 AND o.estado <> 'cancelado'
         GROUP BY a.id_articulo, a.nombre ORDER BY unidades DESC LIMIT 10`,
        [idVendedor]
      ),
    ]);

    const vendedor = info.rows[0];
    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    const respuesta = {
      vendedor: { id: vendedor.id_cliente, nombre: vendedor.nombre, apellido_paterno: vendedor.apellido_paterno },
      resumen: {
        total_ordenes: resumen.rows[0].total_ordenes,
        articulos_vendidos: resumen.rows[0].articulos_vendidos,
        ingresos: Number(resumen.rows[0].ingresos),
      },
      por_dia: porDia.rows.map((fila) => ({ ...fila, ingresos: Number(fila.ingresos) })),
      por_semana: porSemana.rows.map((fila) => ({ ...fila, ingresos: Number(fila.ingresos) })),
      top_productos: topProductos.rows.map((fila) => ({ ...fila, ingresos: Number(fila.ingresos) })),
    };

    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'ver_ventas',
      entidad: 'venta',
      detalle: { total_ordenes: respuesta.resumen.total_ordenes, ingresos: respuesta.resumen.ingresos },
      ip: req.ip,
    });

    res.json(respuesta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
