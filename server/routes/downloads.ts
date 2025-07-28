import express from 'express';
import { Parser } from 'json2csv';
import { insertDownloadSchema } from '../../shared/schema';
import { getCurrentUser, isAuthenticated } from '../auth';
import { listDownloads, logActivity, logDownload } from '../lib/db';
import { checkDownloadQuota } from '../lib/rlsSecurity';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createValidationMiddleware } from '../lib/validation';

const router = express.Router();

// POST /api/downloads - Log a download
router.post('/', isAuthenticated, createValidationMiddleware(insertDownloadSchema), async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { productId, license } = req.body;

    // Check download quota
    const hasQuota = await checkDownloadQuota(user.id, license);
    if (!hasQuota) {
      return res.status(403).json({ error: 'Download quota exceeded for this license type' });
    }

    // Log the download
    const download = await logDownload({
      userId: user.id,
      productId,
      license
    });

    // Log activity
    await logActivity({
      user_id: user.id,
      event_type: 'download',
      details: {
        product_id: productId,
        license,
        download_count: download.download_count || 1
      },
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      download: {
        id: download.id,
        licenseType: download.license,
        download_count: download.download_count
      }
    });
  } catch (error: any) {
    console.error('Download error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/downloads - List user downloads
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const downloads = await listDownloads(user.id);
    
    res.json({
      downloads: downloads.map(download => ({
        id: download.id,
        product_id: download.product_id,
        license: download.license,
        downloaded_at: download.downloaded_at,
        download_count: download.download_count
      }))
    });
  } catch (error: any) {
    console.error('List downloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/downloads/export - Export downloads as CSV
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const downloads = await listDownloads(user.id);
    
    // Prepare CSV data
    const csvData = downloads.map(download => ({
      product_id: download.product_id,
      license: download.license,
      downloaded_at: download.downloaded_at,
      download_count: download.download_count || 1
    }));

    // Generate CSV
    const parser = new Parser({
      fields: ['product_id', 'license', 'downloaded_at', 'download_count'],
      header: true
    });
    
    const csv = parser.parse(csvData);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="downloads.csv"');
    
    res.send(csv);
  } catch (error: any) {
    console.error('Export downloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download status for a user
router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: downloads, error } = await supabaseAdmin
      .from('downloads')
      .select('*')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching downloads:', error);
      return res.status(500).json({ error: 'Failed to fetch downloads' });
    }

    res.json(downloads || []);
  } catch (error: any) {
    console.error('Downloads status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download URL for a specific beat
router.get('/beat/:beatId', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const beatId = parseInt(req.params.beatId);
    if (isNaN(beatId)) {
      return res.status(400).json({ error: 'Valid beat ID is required' });
    }

    // Vérifier si l'utilisateur a accès au beat
    // TODO: Implémenter la logique de vérification d'accès selon l'abonnement

    // Simuler l'URL de téléchargement
    const downloadUrl = `https://brolabentertainment.com/downloads/beat_${beatId}.mp3`;
    
    // Enregistrer le téléchargement
    const { error: downloadError } = await supabaseAdmin
      .from('downloads')
      .insert({
        user_id: user.id,
        product_id: beatId,
        license: 'standard',
        download_count: 1
      });

    if (downloadError) {
      console.error('Error recording download:', downloadError);
    }

    res.json({
      downloadUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      license: 'standard'
    });
  } catch (error: any) {
    console.error('Download beat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download history for a user
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data: history, error } = await supabaseAdmin
      .from('downloads')
      .select(`
        *,
        beats:product_id (
          title,
          genre,
          bpm
        )
      `)
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching download history:', error);
      return res.status(500).json({ error: 'Failed to fetch download history' });
    }

    res.json(history || []);
  } catch (error: any) {
    console.error('Download history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download statistics
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Statistiques de téléchargement
    const { data: downloads, error } = await supabaseAdmin
      .from('downloads')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching download stats:', error);
      return res.status(500).json({ error: 'Failed to fetch download stats' });
    }

    const stats = {
      totalDownloads: downloads?.length || 0,
      thisMonth: downloads?.filter(d => {
        const downloadDate = new Date(d.downloaded_at);
        const now = new Date();
        return downloadDate.getMonth() === now.getMonth() && 
               downloadDate.getFullYear() === now.getFullYear();
      }).length || 0,
      thisWeek: downloads?.filter(d => {
        const downloadDate = new Date(d.downloaded_at);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return downloadDate >= weekAgo;
      }).length || 0,
      today: downloads?.filter(d => {
        const downloadDate = new Date(d.downloaded_at);
        const now = new Date();
        return downloadDate.toDateString() === now.toDateString();
      }).length || 0
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Download stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;