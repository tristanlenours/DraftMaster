import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let hasLoggedStatus = false;

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export function getPublicSupabaseConfig(): {
  readonly configured: boolean;
  readonly url?: string;
  readonly anonKey?: string;
} {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (url && anonKey && url.startsWith("http")) {
    return {
      configured: true,
      url,
      anonKey,
    };
  }
  return { configured: false };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith("http")) {
    if (!hasLoggedStatus) {
      console.log(
        "ℹ️ [Storage] Supabase non configuré (mode local JSON actif via data/leaderboard.json)",
      );
      hasLoggedStatus = true;
    }
    return null;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    if (!hasLoggedStatus) {
      console.log(`⚡ [Storage] Connecté à Supabase PostgreSQL (${url}) !`);
      hasLoggedStatus = true;
    }

    return cachedClient;
  } catch (err) {
    console.warn("⚠️ [Storage] Échec d'initialisation de Supabase :", err);
    return null;
  }
}
