import { Router } from 'express';
import multer from 'multer';
import { uploadUserFile, getSignedUrl, deleteFile, STORAGE_BUCKETS } from '../lib/storage';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { validateFileUpload, fileUploadValidation, fileFilterValidation, createValidationMiddleware } from '../lib/validation';
import { uploadRateLimit, downloadRateLimit } from '../middleware/rateLimiter';
import type { File, InsertFile } from '../../shared/schema';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Upload file endpoint with validation and rate limiting
router.post('/upload', uploadRateLimit, upload.single('file'), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file upload security
    const fileValidation = validateFileUpload(req.file);
    if (!fileValidation.valid) {
      return res.status(400).json({ 
        error: 'File validation failed', 
        details: fileValidation.errors 
      });
    }

    const { reservation_id, order_id, role = 'upload' } = req.body;
    const userId = req.user!.id;

    // Determine bucket based on file role
    let bucket: string = STORAGE_BUCKETS.USER_UPLOADS;
    if (role === 'deliverable') bucket = STORAGE_BUCKETS.DELIVERABLES;
    if (role === 'invoice') bucket = STORAGE_BUCKETS.INVOICES;

    // Generate unique file path
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExtension}`;
    const filePath = `${role}s/${fileName}`;

    // Upload to Supabase Storage
    const { path, fullUrl } = await uploadUserFile(
      userId,
      req.file.buffer,
      bucket,
      filePath,
      { contentType: req.file.mimetype }
    );

    // Validate and save file record to database
    const fileRecord: InsertFile = {
      owner_id: userId,
      reservation_id: reservation_id || null,
      order_id: order_id ? parseInt(order_id) : null,
      storage_path: path,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      role: role as "upload" | "deliverable" | "invoice"
    };

    // Validate against schema
    const validatedRecord = fileUploadValidation.parse(fileRecord);

    const { data, error } = await supabaseAdmin
      .from('files')
      .insert(validatedRecord)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true, 
      file: data,
      url: fullUrl 
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get signed URL for private file access with rate limiting
router.get('/signed-url/:fileId', downloadRateLimit, async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileId } = req.params;
    const userId = req.user!.id;

    // Get file record from database
    const { data: file, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check ownership
    if (file.owner_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine bucket
    let bucket: string = STORAGE_BUCKETS.USER_UPLOADS;
    if (file.role === 'deliverable') bucket = STORAGE_BUCKETS.DELIVERABLES;
    if (file.role === 'invoice') bucket = STORAGE_BUCKETS.INVOICES;

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await getSignedUrl(bucket, file.storage_path, 3600);

    res.json({ url: signedUrl });
  } catch (error: any) {
    console.error('Signed URL error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List user files with validation
router.get('/files', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user!.id;
    
    // Validate query parameters
    const filters = fileFilterValidation.parse({
      role: req.query.role as string | undefined,
      reservation_id: req.query.reservation_id as string | undefined,
      order_id: req.query.order_id ? parseInt(req.query.order_id as string) : undefined,
      owner_id: userId
    });

    let query = supabaseAdmin
      .from('files')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (filters.role) query = query.eq('role', filters.role);
    if (filters.reservation_id) query = query.eq('reservation_id', filters.reservation_id);
    if (filters.order_id) query = query.eq('order_id', filters.order_id);

    const { data: files, error } = await query;

    if (error) throw error;

    res.json({ files });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/files/:fileId', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { fileId } = req.params;
    const userId = req.user!.id;

    // Get file record
    const { data: file, error: fetchError } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check ownership
    if (file.owner_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine bucket
    let bucket: string = STORAGE_BUCKETS.USER_UPLOADS;
    if (file.role === 'deliverable') bucket = STORAGE_BUCKETS.DELIVERABLES;
    if (file.role === 'invoice') bucket = STORAGE_BUCKETS.INVOICES;

    // Delete from storage
    await deleteFile(bucket, file.storage_path);

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('id', fileId);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;