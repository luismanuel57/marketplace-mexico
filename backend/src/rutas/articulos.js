import { Router } from 'express';
import { listar, detalle, crear, modificar, desactivar, marcarDestacado } from '../controladores/articulosController.js';
import { autenticar, esAdmin, esDuenoArticulo } from '../middlewares/auth.js';

const router = Router();

// Publicar artículos: vendedores (dueños) y administradores.
function esVendedorOAdmin(req, res, next) {
  const rol = req.cliente && req.cliente.rol;
  if (rol === 'vendedor' || rol === 'administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de vendedor o administrador' });
}

// El catálogo público no exige token; la consulta de un vendedor (?vendedor=)
// sí, para verificar que solo consulte sus propios artículos.
router.get('/', (req, res, next) => {
  if (req.query.vendedor !== undefined) return autenticar(req, res, next);
  next();
}, listar);
router.get('/:id', detalle);
router.post('/', autenticar, esVendedorOAdmin, crear);
router.put('/:id/destacado', autenticar, esAdmin, marcarDestacado);
router.put('/:id', autenticar, esDuenoArticulo, modificar);
router.delete('/:id', autenticar, esDuenoArticulo, desactivar);

export default router;
