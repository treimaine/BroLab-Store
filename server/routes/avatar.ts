import { Router } from 'express';
import multer from 'multer';
import { isAuthenticated } from '../auth';
import { updateUserAvatar } from '../lib/db';
import { scanFile, uploadToSupabase, validateFile } from '../lib/upload';
import { uploadRateLimit } from '../middleware/rateLimiter';

const router = Router();

// Configuration multer pour stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max pour les avatars
});

// Route d'upload d'avatar
router.post('/upload', 
  isAuthenticated,
  uploadRateLimit,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      // Validation du fichier (images uniquement)
      const validation = await validateFile(req.file, {
        category: 'image',
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        maxSize: 5 * 1024 * 1024 // 5MB
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Validation du fichier échouée',
          details: validation.errors
        });
      }

      // Scan antivirus
      const isSafe = await scanFile(req.file);
      if (!isSafe) {
        return res.status(400).json({
          error: 'Le fichier n\'a pas passé le scan de sécurité'
        });
      }

      // Génération du chemin de stockage pour l'avatar
      const timestamp = Date.now();
      const userId = req.user!.id;
      const extension = req.file.originalname.split('.').pop();
      const filePath = `avatars/${userId}/${timestamp}.${extension}`;

      // Upload vers Supabase Storage
      const { path, url } = await uploadToSupabase(req.file, filePath, {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      });

      // Mise à jour de l'avatar dans la base de données
      await updateUserAvatar(userId, url);

      res.json({
        success: true,
        url,
        message: 'Avatar mis à jour avec succès'
      });

    } catch (error: any) {
      console.error('Erreur upload avatar:', error);
      res.status(500).json({ 
        error: 'Erreur lors de l\'upload de l\'avatar',
        details: error.message 
      });
    }
  }
);

export default router; 