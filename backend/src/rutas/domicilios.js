import { Router } from 'express';
import { listar, crear } from '../controladores/domiciliosController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

router.get('/', autenticar, listar);
router.post('/', autenticar, crear);

export default router;
