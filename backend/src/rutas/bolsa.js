import { Router } from 'express';
import { ver, agregar, actualizarCantidad, eliminar } from '../controladores/bolsaController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

router.get('/', autenticar, ver);
router.post('/', autenticar, agregar);
router.put('/articulos/:idDetalle', autenticar, actualizarCantidad);
router.delete('/articulos/:idDetalle', autenticar, eliminar);

export default router;
