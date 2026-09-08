import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IS_MOCK_MODE } from "./is-mock-mode";
import { createMockClient } from "./dev-mock-client";

export function createClient(): SupabaseClient<Database> {
  if (IS_MOCK_MODE) return createMockClient();

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
