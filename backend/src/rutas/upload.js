import { Router } from 'express';
import { subirImagen, subir } from '../controladores/uploadController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

// Subir imágenes: vendedores (para sus artículos) y administradores.
function esVendedorOAdmin(req, res, next) {
  const rol = req.cliente && req.cliente.rol;
  if (rol === 'vendedor' || rol === 'administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de vendedor o administrador' });
}

router.post('/imagen', autenticar, esVendedorOAdmin, subirImagen, subir);

export default router;
