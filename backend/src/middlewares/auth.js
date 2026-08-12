import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const cabecera = req.headers.authorization;
  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: falta el token' });
  }
  try {
    const token = cabecera.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.cliente = { id: payload.id, rol: payload.rol };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function esAdmin(req, res, next) {
  if (req.cliente && req.cliente.rol === 'administrador') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
}
