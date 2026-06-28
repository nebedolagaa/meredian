/**
 * Resolves Supabase connection settings from environment variables.
 *
 * Supports both the new publishable key name
 * (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, format `sb_publishable_…`) and the
 * legacy anon key name (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
