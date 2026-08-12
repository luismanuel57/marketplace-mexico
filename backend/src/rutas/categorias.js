import { Router } from 'express';
import { listar, crear, modificar, desactivar } from '../controladores/categoriasController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/', listar);
router.post('/', autenticar, esAdmin, crear);
router.put('/:id', autenticar, esAdmin, modificar);
router.delete('/:id', autenticar, esAdmin, desactivar);

export default router;
