// Caché en memoria de imágenes descargadas de Google Drive.
// key = file ID de Drive, valor = { buffer, contentType }.
const cache = new Map();
const LIMITE_CACHE = 200;

// Descarga la imagen desde Drive y la sirve al navegador, evitando que el
// hotlink de Google Drive bloquee la petición directa (HTTP 429/403 por
// cabeceras Referer / Sec-Fetch-Dest).
export async function servirImagen(req, res) {
  try {
    const { id } = req.params;

    const enCache = cache.get(id);
    if (enCache) {
      res.set('Content-Type', enCache.contentType);
      return res.send(enCache.buffer);
    }

    const respuesta = await fetch('https://drive.google.com/thumbnail?id=' + id + '&sz=w800');
    if (!respuesta.ok) {
      return res.status(respuesta.status).json({ error: 'No se pudo obtener la imagen' });
    }

    const contentType = respuesta.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await respuesta.arrayBuffer());

    cache.set(id, { buffer, contentType });
    if (cache.size > LIMITE_CACHE) {
      cache.delete(cache.keys().next().value);
    }

    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Devuelve la URL absoluta del proxy para un file ID de Drive.
// Usa el host del request para que el navegador la pida al backend
// (localhost:3000) y no al servidor estático del frontend.
export function urlImagenLocal(id, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/imagenes/${id}`;
}
