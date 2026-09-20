import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export type AppSupabaseClient = SupabaseClient;

export function createClient(): AppSupabaseClient {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
