import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;
let cachedServiceRoleClient: SupabaseClient | null = null;
let hasLoggedStatus = false;
let hasLoggedServiceRoleStatus = false;

export function getCleanUrl(): string | undefined {
  const raw = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
    ?.trim()
    .replace(/^["']|["']$/g, "");
  if (!raw) return undefined;
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
}

export function getCleanKey(): string | undefined {
  const raw = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_KEY
  )
    ?.trim()
    .replace(/^["']|["']$/g, "");
  return raw && raw.length > 0 ? raw : undefined;
}

export function getCleanServiceRoleKey(): string | undefined {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  return raw && raw.length > 0 ? raw : undefined;
}

export function isSupabaseConfigured(): boolean {
  const url = getCleanUrl();
  const key = getCleanKey();
  return Boolean(url && key && url.startsWith("http"));
}

export function getPublicSupabaseConfig(): {
  readonly configured: boolean;
  readonly url?: string;
  readonly anonKey?: string;
} {
  const url = getCleanUrl();
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ?.trim()
    .replace(/^["']|["']$/g, "");
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

  const url = getCleanUrl();
  const key = getCleanKey();

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

export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  if (cachedServiceRoleClient) return cachedServiceRoleClient;

  const url = getCleanUrl();
  const key = getCleanServiceRoleKey();
  if (!url || !key || !url.startsWith("http")) {
    if (!hasLoggedServiceRoleStatus) {
      console.log("ℹ️ [Tournament storage] Supabase service_role non configuré.");
      hasLoggedServiceRoleStatus = true;
    }
    return null;
  }

  try {
    cachedServiceRoleClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    if (!hasLoggedServiceRoleStatus) {
      console.log(`⚡ [Tournament storage] Connecté à Supabase PostgreSQL (${url}).`);
      hasLoggedServiceRoleStatus = true;
    }
    return cachedServiceRoleClient;
  } catch (error) {
    console.warn("⚠️ [Tournament storage] Échec d'initialisation de Supabase :", error);
    return null;
  }
}
