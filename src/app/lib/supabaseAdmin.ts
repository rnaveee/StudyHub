import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.server";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  supabaseAdmin ??= createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}
