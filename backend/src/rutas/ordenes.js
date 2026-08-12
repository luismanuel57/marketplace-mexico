import { Router } from 'express';
import { crear, listarMios, detalle, listarTodos, cambiarEstado } from '../controladores/ordenesController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.post('/', autenticar, crear);
router.get('/', autenticar, listarMios);
router.get('/todas', autenticar, esAdmin, listarTodos);
router.get('/:id', autenticar, detalle);
router.put('/:id/estado', autenticar, esAdmin, cambiarEstado);

export default router;
