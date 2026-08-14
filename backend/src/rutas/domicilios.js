import { Router } from 'express';
import { listar, crear, consultarCodigoPostal } from '../controladores/domiciliosController.js';
import { autenticar } from '../middlewares/auth.js';

const router = Router();

// Pública (sin autenticar): la consulta de CP la necesita el formulario de
// registro (login.html, sin sesión) y también el de dirección del carrito
// (con sesión). Al ser pública, la petición opcional con token se ignora.
// Va ANTES de cualquier ruta /:id para no capturar el segmento.
router.get('/consulta-cp/:cp', consultarCodigoPostal);

router.get('/', autenticar, listar);
router.post('/', autenticar, crear);

export default router;
