import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[CivicFix] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(url, anon);
export default supabase;

