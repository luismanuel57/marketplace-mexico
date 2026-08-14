import { Router } from 'express';
import {
  listar,
  listarTodas,
  crear,
  modificar,
  cambiarEstatus,
  eliminar,
} from '../controladores/categoriasController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

// El catálogo y el select de artículos usan la lista pública (solo activas).
router.get('/', listar);
// Panel de administración: todas las categorías. Debe registrarse antes de
// cualquier ruta con parámetro :id para no capturar "todas" como un id.
router.get('/todas', autenticar, esAdmin, listarTodas);
router.post('/', autenticar, esAdmin, crear);
router.put('/:id', autenticar, esAdmin, modificar);
router.patch('/:id/estatus', autenticar, esAdmin, cambiarEstatus);
router.delete('/:id', autenticar, esAdmin, eliminar);

export default router;
