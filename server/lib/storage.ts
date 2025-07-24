import { supabaseAdmin } from './supabaseAdmin';
import type { File, InsertFile } from '../../shared/schema';

// Supabase Storage buckets configuration
const STORAGE_BUCKETS = {
  USER_UPLOADS: 'user-uploads',
  DELIVERABLES: 'deliverables', 
  INVOICES: 'invoices'
} as const;

// Upload file to Supabase Storage
export async function uploadUserFile(
  userId: number,
  file: Buffer,
  bucket: keyof typeof STORAGE_BUCKETS | string,
  path: string,
  options: { contentType?: string; cacheControl?: string } = {}
): Promise<{ path: string; fullUrl: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options.contentType,
      cacheControl: options.cacheControl || '3600',
      upsert: false
    });

  if (error) throw error;
  
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return { path: data.path, fullUrl: publicUrl };
}

// Get signed URL for private file access
export async function getSignedUrl(
  bucket: keyof typeof STORAGE_BUCKETS | string, 
  path: string, 
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// Delete file from storage
export async function deleteFile(bucket: keyof typeof STORAGE_BUCKETS | string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
}

export { STORAGE_BUCKETS };