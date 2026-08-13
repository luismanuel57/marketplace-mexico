import { Router } from 'express';
import { subirImagen, subir } from '../controladores/uploadController.js';
import { autenticar, esAdmin } from '../middlewares/auth.js';

const router = Router();

router.post('/imagen', autenticar, esAdmin, subirImagen, subir);

export default router;
