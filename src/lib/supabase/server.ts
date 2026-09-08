import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IS_MOCK_MODE } from "./is-mock-mode";
import { createMockClient } from "./dev-mock-client";

export async function createClient(): Promise<SupabaseClient<Database>> {
  if (IS_MOCK_MODE) return createMockClient();

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component sem permissão de escrita em
            // cookies — o middleware já cuida do refresh de sessão nesse caso.
          }
        },
      },
    },
  );
}
