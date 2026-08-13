import pool from '../db.js';

// Registra una entrada en la bitácora de auditoría.
// NUNCA se guardan contraseñas ni datos sensibles en detalle.
// Los errores de registro no deben romper la operación principal:
// cualquier fallo aquí se registra en consola y se ignora.
export async function registrarBitacora({
  id_cliente = null,
  correo = null,
  accion,
  entidad = null,
  id_entidad = null,
  detalle = null,
  ip = null,
}) {
  try {
    await pool.query(
      `INSERT INTO bitacora (id_cliente, correo, accion, entidad, id_entidad, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id_cliente, correo, accion, entidad, id_entidad, detalle ? JSON.stringify(detalle) : null, ip]
    );
  } catch (error) {
    console.error('No se pudo registrar en bitácora:', error.message);
  }
}
