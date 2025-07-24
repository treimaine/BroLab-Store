// server/lib/dbUser.ts
import type { User } from '../../shared/schema';
import { supabaseAdmin } from './supabaseAdmin';

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  if (error) throw new Error(error.message);
  return data;
}