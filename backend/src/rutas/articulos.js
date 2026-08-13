import { Router } from 'express';
import { listar, detalle, crear, modificar, desactivar } from '../controladores/articulosController.js';
import { autenticar, esDuenoArticulo } from '../middlewares/auth.js';

const router = Router();

// Publicar artículos: vendedores (dueños) y administradores.
function esVendedorOAdmin(req, res, next) {
  const rol = req.cliente && req.cliente.rol;
  if (rol === 'vendedor' || rol === 'administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de vendedor o administrador' });
}

router.get('/', listar);
router.get('/:id', detalle);
router.post('/', autenticar, esVendedorOAdmin, crear);
router.put('/:id', autenticar, esDuenoArticulo, modificar);
router.delete('/:id', autenticar, esDuenoArticulo, desactivar);

export default router;
