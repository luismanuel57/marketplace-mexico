import { Router } from 'express';
import { listar, articulosDeVendedor } from '../controladores/vendedoresController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.get('/', autenticar, esAdmin, listar);
router.get('/:id/articulos', autenticar, esAdmin, articulosDeVendedor);

export default router;
