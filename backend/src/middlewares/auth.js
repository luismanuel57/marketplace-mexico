import jwt from 'jsonwebtoken';
import pool from '../db.js';

export function autenticar(req, res, next) {
  const cabecera = req.headers.authorization;
  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta el token' });
  }
  try {
    const token = cabecera.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.cliente = { id: payload.id, rol: payload.rol, correo: payload.correo };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function esAdmin(req, res, next) {
  if (req.cliente && req.cliente.rol === 'administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
}

export function esVendedor(req, res, next) {
  if (req.cliente && req.cliente.rol === 'vendedor') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de vendedor' });
}

// Verifica que el vendedor sea dueño del artículo. El administrador
// pasa sin verificación de propiedad.
export async function esDuenoArticulo(req, res, next) {
  if (!req.cliente) {
    return res.status(401).json({ error: 'No autorizado: falta el token' });
  }
  if (req.cliente.rol === 'administrador') {
    return next();
  }
  try {
    const resultado = await pool.query(
      'SELECT id_vendedor FROM articulos WHERE id_articulo = $1',
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    if (req.cliente.rol !== 'vendedor' || resultado.rows[0].id_vendedor !== req.cliente.id) {
      return res.status(403).json({ error: 'No puedes modificar un artículo que no te pertenece' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
