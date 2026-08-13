import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { registrarBitacora } from '../servicios/bitacoraService.js';

export async function registrar(req, res) {
  const cliente = await pool.connect();
  try {
    const { nombre, apellido_paterno, apellido_materno, correo, telefono, contrasena, rol, domicilio } = req.body;

    if (!nombre || !apellido_paterno || !correo || !contrasena) {
      return res.status(400).json({ error: 'nombre, apellido_paterno, correo y contrasena son obligatorios' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: 'Correo electrónico inválido' });
    }
    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const rolSolicitado = rol || 'cliente';
    if (!['cliente', 'vendedor'].includes(rolSolicitado)) {
      return res.status(400).json({ error: 'Rol inválido. Valores permitidos: cliente, vendedor' });
    }
    if (domicilio) {
      const { calle, colonia, codigo_postal, municipio, estado } = domicilio;
      if (!calle || !colonia || !codigo_postal || !municipio || !estado) {
        return res.status(400).json({ error: 'calle, colonia, codigo_postal, municipio y estado son obligatorios en domicilio' });
      }
      if (!/^\d{5}$/.test(codigo_postal)) {
        return res.status(400).json({ error: 'Código postal inválido (deben ser 5 dígitos)' });
      }
    }

    const existe = await cliente.query('SELECT id_cliente FROM clientes WHERE correo = $1', [correo]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, 10);
    const rolSeleccionado = await cliente.query(
      'SELECT id_rol FROM roles WHERE nombre_rol = $1',
      [rolSolicitado]
    );
    if (rolSeleccionado.rows.length === 0) {
      return res.status(400).json({ error: 'El rol seleccionado no existe en el sistema' });
    }

    await cliente.query('BEGIN');

    const insert = await cliente.query(
      `INSERT INTO clientes (nombre, apellido_paterno, apellido_materno, correo, telefono, contrasena_hash, id_rol)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id_cliente, nombre, apellido_paterno, apellido_materno, correo, telefono`,
      [nombre, apellido_paterno, apellido_materno || null, correo, telefono || null, contrasenaHash, rolSeleccionado.rows[0].id_rol]
    );

    let nuevoDomicilio = null;
    if (domicilio) {
      const d = await cliente.query(
        `INSERT INTO domicilios (id_cliente, nombre, calle, numero, colonia, codigo_postal, municipio, estado, pais, telefono_contacto)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          insert.rows[0].id_cliente,
          domicilio.nombre || null,
          domicilio.calle,
          domicilio.numero || null,
          domicilio.colonia,
          domicilio.codigo_postal,
          domicilio.municipio,
          domicilio.estado,
          domicilio.pais || 'México',
          domicilio.telefono_contacto || null,
        ]
      );
      nuevoDomicilio = d.rows[0];
    }

    await cliente.query('COMMIT');

    res.status(201).json({ mensaje: 'Usuario registrado', usuario: insert.rows[0], domicilio: nuevoDomicilio });
  } catch (error) {
    await cliente.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    cliente.release();
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
      { id: usuario.id_cliente, rol: usuario.rol, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await registrarBitacora({
      id_cliente: usuario.id_cliente,
      correo: usuario.correo,
      accion: 'login',
      entidad: 'cliente',
      id_entidad: usuario.id_cliente,
      detalle: { rol: usuario.rol },
      ip: req.ip,
    });

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
