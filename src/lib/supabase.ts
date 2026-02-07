import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a real client when env vars are present, or a placeholder
// that gracefully fails during build/prerendering without env vars.
export const supabase: SupabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (createClient("https://placeholder.supabase.co", "placeholder") as SupabaseClient);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
