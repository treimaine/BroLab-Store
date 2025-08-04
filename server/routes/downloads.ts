import express from 'express';
import { Parser } from 'json2csv';
import { insertDownloadSchema } from '../../shared/schema';
import { getCurrentUser, isAuthenticated } from '../auth';
import { listDownloads, logActivity, logDownload } from '../lib/db';
import { checkDownloadQuota } from '../lib/rlsSecurity';
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

export default router;