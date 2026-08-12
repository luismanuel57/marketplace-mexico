import { Router } from 'express';
import { listar } from '../controladores/clientesController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/', autenticar, esAdmin, listar);

export default router;
