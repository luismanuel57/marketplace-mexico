import { Router } from 'express';
import { listar, detalle, crear, modificar, desactivar } from '../controladores/articulosController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/', listar);
router.get('/:id', detalle);
router.post('/', autenticar, esAdmin, crear);
router.put('/:id', autenticar, esAdmin, modificar);
router.delete('/:id', autenticar, esAdmin, desactivar);

export default router;
