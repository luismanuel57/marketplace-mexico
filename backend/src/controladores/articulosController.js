import pool from '../db.js';
import { registrarBitacora } from '../servicios/bitacoraService.js';

const SELECT_BASE = `
  SELECT a.id_articulo, a.nombre, a.descripcion, a.precio_mxn, a.existencias,
         a.imagen_url, a.marca, a.estatus, a.fecha_registro, a.id_vendedor, a.destacado,
         c.id_categoria, c.nombre AS categoria
  FROM articulos a
  JOIN categorias c ON c.id_categoria = a.id_categoria
`;

export async function listar(req, res) {
  try {
    const { q, categoria, precio_min, precio_max, disponible, destacado } = req.query;
    const condiciones = ['a.estatus = $1'];
    const valores = ['activo'];
    let siguiente = 2;

    if (q) {
      condiciones.push(`a.nombre ILIKE $${siguiente++}`);
      valores.push(`%${q}%`);
    }
    if (categoria) {
      condiciones.push(`c.nombre = $${siguiente++}`);
      valores.push(categoria);
    }
    if (precio_min !== undefined) {
      condiciones.push(`a.precio_mxn >= $${siguiente++}`);
      valores.push(Number(precio_min));
    }
    if (precio_max !== undefined) {
      condiciones.push(`a.precio_mxn <= $${siguiente++}`);
      valores.push(Number(precio_max));
    }
    if (disponible === 'true') {
      condiciones.push('a.existencias > 0');
    }
    if (destacado === 'true') {
      condiciones.push('a.destacado = TRUE');
    }

    let sql = `${SELECT_BASE} WHERE ${condiciones.join(' AND ')}`;
    sql += destacado === 'true' ? ' ORDER BY a.precio_mxn DESC LIMIT 8' : ' ORDER BY a.nombre';

    const resultado = await pool.query(sql, valores);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function detalle(req, res) {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      `${SELECT_BASE} WHERE a.id_articulo = $1 AND a.estatus = 'activo'`,
      [id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crear(req, res) {
  try {
    const { id_categoria, nombre, descripcion, precio_mxn, existencias, imagen_url, marca, id_vendedor } = req.body;

    if (!id_categoria || !nombre || precio_mxn === undefined) {
      return res.status(400).json({ error: 'id_categoria, nombre y precio_mxn son obligatorios' });
    }
    if (!Number.isFinite(Number(precio_mxn)) || Number(precio_mxn) < 0) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor o igual a 0' });
    }
    if (existencias !== undefined && (!Number.isFinite(Number(existencias)) || Number(existencias) < 0)) {
      return res.status(400).json({ error: 'Las existencias no pueden ser negativas' });
    }

    const cat = await pool.query('SELECT id_categoria FROM categorias WHERE id_categoria = $1', [id_categoria]);
    if (cat.rows.length === 0) {
      return res.status(400).json({ error: 'La categoría no existe' });
    }

    // El vendedor publica como dueño propio; el administrador puede elegir
    // un vendedor (id_vendedor) o publicar como dueño él mismo.
    let idVendedor = req.cliente.id;
    if (req.cliente.rol === 'administrador' && id_vendedor) {
      const vendedor = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [id_vendedor]);
      if (vendedor.rows.length === 0) {
        return res.status(400).json({ error: 'El vendedor indicado no existe' });
      }
      idVendedor = Number(id_vendedor);
    }

    const resultado = await pool.query(
      `INSERT INTO articulos (id_categoria, id_vendedor, nombre, descripcion, precio_mxn, existencias, imagen_url, marca)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id_categoria, idVendedor, nombre, descripcion || null, Number(precio_mxn), existencias || 0, imagen_url || null, marca || null]
    );

    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'crear_articulo',
      entidad: 'articulo',
      id_entidad: resultado.rows[0].id_articulo,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });

    res.status(201).json({ mensaje: 'Producto creado', articulo: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function modificar(req, res) {
  try {
    const { id } = req.params;
    const { id_categoria, nombre, descripcion, precio_mxn, existencias, imagen_url, marca } = req.body;

    const existe = await pool.query('SELECT id_articulo FROM articulos WHERE id_articulo = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    if (precio_mxn !== undefined && (!Number.isFinite(Number(precio_mxn)) || Number(precio_mxn) < 0)) {
      return res.status(400).json({ error: 'El precio debe ser un número mayor o igual a 0' });
    }
    if (existencias !== undefined && (!Number.isFinite(Number(existencias)) || Number(existencias) < 0)) {
      return res.status(400).json({ error: 'Las existencias no pueden ser negativas' });
    }

    const resultado = await pool.query(
      `UPDATE articulos SET
         id_categoria = COALESCE($2, id_categoria),
         nombre       = COALESCE($3, nombre),
         descripcion  = COALESCE($4, descripcion),
         precio_mxn   = COALESCE($5, precio_mxn),
         existencias  = COALESCE($6, existencias),
         imagen_url   = COALESCE($7, imagen_url),
         marca        = COALESCE($8, marca)
       WHERE id_articulo = $1
       RETURNING *`,
      [id, id_categoria, nombre, descripcion, precio_mxn, existencias, imagen_url, marca]
    );

    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'modificar_articulo',
      entidad: 'articulo',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });

    res.json({ mensaje: 'Producto actualizado', articulo: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function desactivar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await pool.query(
      'UPDATE articulos SET estatus = $2 WHERE id_articulo = $1 RETURNING id_articulo, nombre, estatus',
      [id, 'inactivo']
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'desactivar_articulo',
      entidad: 'articulo',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre },
      ip: req.ip,
    });
    res.json({ mensaje: 'Producto desactivado', articulo: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function marcarDestacado(req, res) {
  try {
    const { id } = req.params;
    const { destacado } = req.body;

    if (typeof destacado !== 'boolean') {
      return res.status(400).json({ error: 'El campo destacado es obligatorio y debe ser true o false' });
    }

    const resultado = await pool.query(
      'UPDATE articulos SET destacado = $2 WHERE id_articulo = $1 RETURNING id_articulo, nombre, destacado',
      [id, destacado]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    await registrarBitacora({
      id_cliente: req.cliente.id,
      correo: req.cliente.correo,
      accion: 'cambiar_destacado',
      entidad: 'articulo',
      id_entidad: id,
      detalle: { nombre: resultado.rows[0].nombre, destacado },
      ip: req.ip,
    });
    res.json({
      mensaje: destacado ? 'Producto marcado como destacado' : 'Producto quitado de destacados',
      articulo: resultado.rows[0],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
