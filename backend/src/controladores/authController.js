import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export async function registrar(req, res) {
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, telefono, contrasena } = req.body;

    if (!nombre || !apellido_paterno || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido_paterno, correo y contrasena son obligatorios' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }
    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existe = await pool.query('SELECT id_cliente FROM clientes WHERE correo = $1', [correo]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const rolCliente = await pool.query("SELECT id_rol FROM roles WHERE nombre_rol = 'cliente'");

    const insert = await pool.query(
      `INSERT INTO clientes (nombre, apellido_paterno, apellido_materno, correo, telefono, contrasena_hash, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_cliente, nombre, apellido_paterno, apellido_materno, correo, telefono`,
      [nombre, apellido_paterno, apellido_materno || null, correo, telefono || null, contrasenaHash, rolCliente.rows[0].id_rol]
    );

    res.status(201).json({ mensaje: 'Usuario registrado', usuario: insert.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function iniciarSesion(req, res) {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'correo y contrasena son obligatorios' });
    }

    const resultado = await pool.query(
      `SELECT cl.id_cliente, cl.nombre, cl.apellido_paterno, cl.correo, cl.contrasena_hash, r.nombre_rol AS rol
       FROM clientes cl
       JOIN roles r ON r.id_rol = cl.id_rol
       WHERE cl.correo = $1 AND cl.estatus = 'activo'`,
      [correo]
    );
    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = resultado.rows[0];
    const valida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!valida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id_cliente, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id_cliente,
        nombre: usuario.nombre,
        apellido_paterno: usuario.apellido_paterno,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
