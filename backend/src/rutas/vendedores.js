import { Router } from 'express';
import { listar, articulosDeVendedor, ventasDeVendedor } from '../controladores/vendedoresController.js';
import { autenticar, esAdmin, esVendedor } from '../middlewares/auth.js';

const router = Router();

// 'mis-ventas' se declara antes de las rutas con parámetro (/:id/...) para
// evitar cualquier colisión de rutas.
router.get('/mis-ventas', autenticar, esVendedor, ventasDeVendedor);
router.get('/', autenticar, esAdmin, listar);
router.get('/:id/articulos', autenticar, esAdmin, articulosDeVendedor);

export default router;
