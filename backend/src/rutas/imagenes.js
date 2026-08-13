import { Router } from 'express';
import { servirImagen } from '../controladores/imagenesController.js';

const router = Router();

router.get('/:id', servirImagen);

export default router;
