import { Router } from 'express';
import multer from 'multer';
import { isAuthenticated } from '../auth';
import { uploadRateLimit } from '../middleware/rateLimiter';
import { validateFile, scanFile, uploadToSupabase } from '../lib/upload';

const router = Router();

// Configuration multer pour stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// Route d'upload sécurisée
router.post('/upload', 
  isAuthenticated,
  uploadRateLimit,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      // Validation du fichier
      const validation = await validateFile(req.file, {
        category: req.body.category || 'audio'
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

      // Génération du chemin de stockage
      const timestamp = Date.now();
      const userId = req.user!.id;
      const extension = req.file.originalname.split('.').pop();
      const filePath = `${userId}/${timestamp}.${extension}`;

      // Upload vers Supabase
      const { path, url } = await uploadToSupabase(req.file, filePath);

      res.json({
        success: true,
        file: {
          path,
          url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size
        }
      });

    } catch (error: any) {
      console.error('Erreur upload:', error);
      res.status(500).json({
        error: 'Échec de l\'upload',
        message: error.message
      });
    }
});

export default router;