import type { ActivityLog, Download, ServiceOrder, ServiceOrderInput, User, File, InsertFile } from '../../shared/schema';
import { supabaseAdmin } from './supabaseAdmin';

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // no rows
    throw error;
  }
  return data as User | null;
}

// Upsert user
export async function upsertUser(user: Partial<User>): Promise<User> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert(user, { onConflict: 'email' }) // string, pas tableau
    .select()
    .single();
  if (error) throw error;
  return data as User;
}

// Log a download event (idempotent: increments count if already exists)
export async function logDownload({
  userId,
  productId,
  license
}: {
  userId: number,
  productId: number,
  license: string
}): Promise<Download> {
  // Upsert: si existe, incrémente download_count et update downloaded_at
  const { data, error } = await supabaseAdmin
    .from('downloads')
    .upsert({
      user_id: userId,
      product_id: productId,
      license,
      downloaded_at: new Date().toISOString(),
      download_count: 1
    }, {
      onConflict: 'user_id,product_id,license',
      ignoreDuplicates: false
    })
    .select()
    .single();
  if (error && error.code !== '23505') throw error;
  if (data) return data as Download;
  // Si conflit, on update download_count (lecture + update)
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('downloads')
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('license', license)
    .single();
  if (fetchError || !existing) throw fetchError || new Error('Download not found');
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('downloads')
    .update({
      downloaded_at: new Date().toISOString(),
      download_count: (existing.download_count || 1) + 1
    })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('license', license)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated as Download;
}

// List all downloads for a user
export async function listDownloads(userId: number): Promise<Download[]> {
  const { data, error } = await supabaseAdmin
    .from('downloads')
    .select('*')
    .eq('user_id', userId)
    .order('downloaded_at', { ascending: false });
  if (error) throw error;
  return data as Download[];
}

// Create a service order
export async function createServiceOrder(order: ServiceOrderInput): Promise<ServiceOrder> {
  const { data, error } = await supabaseAdmin
    .from('service_orders')
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data as ServiceOrder;
}

// List all service orders for a user
export async function listServiceOrders(userId: number): Promise<ServiceOrder[]> {
  const { data, error } = await supabaseAdmin
    .from('service_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceOrder[];
}

export async function getUserById(id: number): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as User | null;
}

// Subscription helpers
export async function upsertSubscription({
  stripeSubId,
  userId,
  plan,
  status,
  current_period_end
}: {
  stripeSubId: string,
  userId: number,
  plan: string,
  status: string,
  current_period_end: string
}): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      stripe_subscription_id: stripeSubId,
      user_id: userId,
      plan,
      status,
      current_period_end
    }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSubscription(userId: number): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function subscriptionStatusHelper(userId: number): Promise<string> {
  const sub = await getSubscription(userId);
  if (!sub) return 'none';
  if (sub.status === 'active' && new Date(sub.current_period_end) > new Date()) {
    return 'active';
  }
  return sub.status || 'inactive';
}

// File management helpers
export async function createFileRecord(fileData: InsertFile): Promise<File> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .insert(fileData)
    .select()
    .single();
  if (error) throw error;
  return data as File;
}

export async function getFileById(fileId: string): Promise<File | null> {
  const { data, error } = await supabaseAdmin
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as File | null;
}

export async function getUserFiles(userId: number, filters?: {
  role?: string;
  reservation_id?: string;
  order_id?: number;
}): Promise<File[]> {
  let query = supabaseAdmin
    .from('files')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (filters?.role) query = query.eq('role', filters.role);
  if (filters?.reservation_id) query = query.eq('reservation_id', filters.reservation_id);
  if (filters?.order_id) query = query.eq('order_id', filters.order_id);

  const { data, error } = await query;
  if (error) throw error;
  return data as File[];
}

export async function deleteFileRecord(fileId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('files')
    .delete()
    .eq('id', fileId);
  if (error) throw error;
}

export async function logActivity(activity: Omit<ActivityLog, 'id'>): Promise<ActivityLog> {
  const { data, error } = await supabaseAdmin
    .from('activity_log')
    .insert({
      ...activity,
      event_type: activity.event_type || 'download',
      timestamp: new Date().toISOString()
    })
    .select()
    .single();
  if (error) throw error;
  return data as ActivityLog;
} 