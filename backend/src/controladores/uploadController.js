import multer from 'multer';
import { subirImagenDrive } from '../servicios/driveService.js';

const almacenamiento = multer.memoryStorage();

const cargador = multer({
  storage: almacenamiento,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, archivo, cb) => {
    const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (permitidos.includes(archivo.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)'));
    }
  },
});

export const subirImagen = cargador.single('imagen');

export async function subir(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }
    const categoria = req.body.categoria || 'Otros';

    const imagen = await subirImagenDrive(req.file, categoria);

    res.status(201).json({
      mensaje: 'Imagen subida a Google Drive',
      imagen_url: imagen.url,
      archivo: imagen.nombre,
    });
  } catch (error) {
    if (error.message.includes('Faltan credenciales') || error.message.includes('invalid_grant')) {
      return res.status(500).json({
        error: 'Error de configuración con Google Drive: ' + error.message,
      });
    }
    res.status(500).json({ error: 'No se pudo subir la imagen: ' + error.message });
  }
}
