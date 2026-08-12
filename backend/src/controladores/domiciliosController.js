import pool from '../db.js';

export async function listar(req, res) {
  try {
    const resultado = await pool.query(
      'SELECT * FROM domicilios WHERE id_cliente = $1 ORDER BY id_domicilio',
      [req.cliente.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, calle, numero, colonia, codigo_postal, municipio, estado, telefono_contacto } = req.body;

    if (!calle || !colonia || !codigo_postal || !municipio || !estado) {
      return res.status(400).json({ error: 'calle, colonia, codigo_postal, municipio y estado son obligatorios' });
    }
    if (!/^\d{5}$/.test(codigo_postal)) {
      return res.status(400).json({ error: 'Código postal inválido (deben ser 5 dígitos)' });
    }

    const resultado = await pool.query(
      `INSERT INTO domicilios (id_cliente, nombre, calle, numero, colonia, codigo_postal, municipio, estado, telefono_contacto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.cliente.id, nombre || null, calle, numero || null, colonia, codigo_postal, municipio, estado, telefono_contacto || null]
    );

    res.status(201).json({ mensaje: 'Dirección registrada', domicilio: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
