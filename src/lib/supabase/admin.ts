import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IS_MOCK_MODE } from "./is-mock-mode";
import { createMockClient } from "./dev-mock-client";

/**
 * Client com a service role key — só usar em Server Actions, nunca em código
 * que roda no browser (por isso o import "server-only" acima: se algum
 * client component importar isso por engano, o build quebra). Único uso
 * hoje: `auth.admin.createUser` pra criar o login de um vendedor a partir de
 * uma tela do admin (ver src/app/(dashboard)/usuarios/actions.ts) — o client
 * normal (anon key) não tem permissão pra isso.
 */
export function createAdminClient(): SupabaseClient<Database> {
  if (IS_MOCK_MODE) return createMockClient();

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
