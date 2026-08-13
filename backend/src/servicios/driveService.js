import { google } from 'googleapis';
import { Readable } from 'stream';

const TIPO_CARPETA = 'application/vnd.google-apps.folder';

const carpetaRaizCache = new Map();
const carpetasCategoriaCache = new Map();

function obtenerClienteOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Faltan credenciales de Google Drive en el .env (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)'
    );
  }

  const cliente = new google.auth.OAuth2(clientId, clientSecret);
  cliente.setCredentials({ refresh_token: refreshToken });
  return cliente;
}

async function buscarCarpeta(drive, nombre, parentId) {
  const consulta = [
    `name = '${nombre.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `'${parentId}' in parents`,
    'trashed = false',
  ].join(' and ');

  const resultado = await drive.files.list({
    q: consulta,
    fields: 'files(id, name)',
    pageSize: 1,
  });
  return resultado.data.files?.[0] || null;
}

async function crearCarpeta(drive, nombre, parentId) {
  const resultado = await drive.files.create({
    requestBody: {
      name: nombre,
      mimeType: TIPO_CARPETA,
      parents: [parentId],
    },
    fields: 'id',
  });
  return resultado.data.id;
}

async function obtenerCarpetaRaiz(drive) {
  const nombreRaiz = process.env.GOOGLE_DRIVE_CARPETA_RAIZ || 'Marketplace-Mexico';
  if (carpetaRaizCache.has(nombreRaiz)) return carpetaRaizCache.get(nombreRaiz);

  const carpeta = await buscarCarpeta(drive, nombreRaiz, 'root');
  const id = carpeta ? carpeta.id : await crearCarpeta(drive, nombreRaiz, 'root');
  carpetaRaizCache.set(nombreRaiz, id);
  return id;
}

async function obtenerCarpetaCategoria(drive, categoria) {
  if (carpetasCategoriaCache.has(categoria)) return carpetasCategoriaCache.get(categoria);

  const raizId = await obtenerCarpetaRaiz(drive);
  const carpeta = await buscarCarpeta(drive, categoria, raizId);
  const id = carpeta ? carpeta.id : await crearCarpeta(drive, categoria, raizId);
  carpetasCategoriaCache.set(categoria, id);
  return id;
}

function sanearNombre(original, mimetype) {
  const extensiones = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extensiones[mimetype] || 'jpg';
  const base = original.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50);
  const unico = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${base || 'imagen'}-${unico}.${ext}`;
}

export async function subirImagenDrive(archivo, categoria) {
  const cliente = obtenerClienteOAuth();
  const drive = google.drive({ version: 'v3', auth: cliente });

  const idCarpeta = await obtenerCarpetaCategoria(drive, categoria);
  const nombre = sanearNombre(archivo.originalname, archivo.mimetype);

  const resultado = await drive.files.create({
    requestBody: {
      name: nombre,
      parents: [idCarpeta],
    },
    media: {
      mimeType: archivo.mimetype || 'image/jpeg',
      body: Readable.from(archivo.buffer),
    },
    fields: 'id, name',
  });

  const fileId = resultado.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId,
    nombre,
    url: `https://drive.google.com/uc?export=view&id=${fileId}`,
  };
}
