// cloudinary.js — helper para subir fotos a Cloudinary
// Variable de entorno necesaria: CLOUDINARY_URL (ej: cloudinary://api_key:api_secret@cloud_name)
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

const CLOUDINARY_ENABLED = !!process.env.CLOUDINARY_URL;

if (CLOUDINARY_ENABLED) {
  cloudinary.config({ secure: true });
  console.log('[Cloudinary] Configurado correctamente');
} else {
  console.log('[Cloudinary] Sin CLOUDINARY_URL — usando almacenamiento local');
}

// Sube un archivo a Cloudinary y devuelve la URL segura
// Si Cloudinary no está configurado, devuelve la URL local
async function uploadPhoto(filePath, folder = 'ruedas/vehicles') {
  if (!CLOUDINARY_ENABLED) {
    // Modo local: retornar la URL local tal cual
    const filename = path.basename(filePath);
    return `/uploads/${filename}`;
  }
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    });
    // Borrar el archivo temporal local después de subir
    try { fs.unlinkSync(filePath); } catch {}
    return result.secure_url;
  } catch (err) {
    console.error('[Cloudinary] Error al subir:', err.message);
    // Fallback: devolver URL local
    return `/uploads/${path.basename(filePath)}`;
  }
}

// Borra una foto de Cloudinary a partir de su URL
async function deletePhoto(url) {
  if (!CLOUDINARY_ENABLED || !url || !url.includes('cloudinary.com')) return;
  try {
    // Extraer public_id de la URL
    const parts = url.split('/');
    const fileWithExt = parts[parts.length - 1];
    const file = fileWithExt.split('.')[0];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${file}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] Error al borrar:', err.message);
  }
}

module.exports = { uploadPhoto, deletePhoto, CLOUDINARY_ENABLED };
