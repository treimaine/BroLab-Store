import { z } from 'zod';
import * as fileType from 'file-type';
import { supabaseAdmin } from './supabaseAdmin';
import { validateFileUpload, fileUploadValidation } from './validation';

// Configuration des types de fichiers autorisés
const ALLOWED_MIME_TYPES = {
  audio: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aiff', 'audio/flac'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf']
};

// Configuration des limites de taille
const SIZE_LIMITS = {
  audio: 50 * 1024 * 1024, // 50MB
  image: 5 * 1024 * 1024,  // 5MB
  document: 10 * 1024 * 1024 // 10MB
};

// Validation avancée des fichiers
export async function validateFile(
  file: Express.Multer.File,
  options: {
    allowedTypes?: string[];
    maxSize?: number;
    category?: 'audio' | 'image' | 'document';
  } = {}
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validation de base avec le système existant
  const baseValidation = validateFileUpload(file);
  if (!baseValidation.valid) {
    return baseValidation;
  }

  // Détection du type de fichier réel
  const fileBuffer = file.buffer;
  const detectedType = await fileType.fileTypeFromBuffer(fileBuffer);

  // Vérification du type MIME
  const category = options.category || 'audio';
  const allowedTypes = options.allowedTypes || ALLOWED_MIME_TYPES[category];
  const detectedMime = detectedType?.mime || file.mimetype;

  if (!allowedTypes.includes(detectedMime)) {
    errors.push(`Type de fichier non autorisé. Types acceptés: ${allowedTypes.join(', ')}`);
  }

  // Vérification de la taille
  const maxSize = options.maxSize || SIZE_LIMITS[category];
  if (file.size > maxSize) {
    errors.push(`Taille de fichier dépassée. Maximum: ${maxSize / (1024 * 1024)}MB`);
  }

  // Vérification supplémentaire pour les fichiers audio
  if (category === 'audio') {
    // TODO: Implémenter la vérification de la qualité audio
    // Par exemple: vérifier le bitrate, la durée, etc.
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Scan antivirus des fichiers (mock pour l'instant)
export async function scanFile(file: Express.Multer.File): Promise<boolean> {
  // TODO: Intégrer ClamAV ou un autre service antivirus
  // Pour l'instant, on simule un scan
  await new Promise(resolve => setTimeout(resolve, 1000));
  return true;
}

// Upload vers Supabase Storage
export async function uploadToSupabase(
  file: Express.Multer.File,
  path: string,
  options: { contentType?: string; cacheControl?: string } = {}
): Promise<{ path: string; url: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, file.buffer, {
      contentType: options.contentType || file.mimetype,
      cacheControl: options.cacheControl || '3600',
      upsert: false
    });

  if (error) throw error;

  // Générer une URL signée avec TTL de 1h
  const signedUrlData = await supabaseAdmin.storage
    .from('uploads')
    .createSignedUrl(data.path, 3600);

  if (!signedUrlData.data) {
    throw new Error('Échec de génération de l\'URL signée');
  }

  return {
    path: data.path,
    url: signedUrlData.data.signedUrl
  };
}

export default {
  validateFile,
  scanFile,
  uploadToSupabase,
  ALLOWED_MIME_TYPES,
  SIZE_LIMITS
};