/**
 * Verdadeiro quando não há projeto Supabase configurado ainda (sem
 * `.env.local` com credenciais reais). Nesse caso, o app roda com um client
 * "mock" (login provisório + dados de exemplo em memória) pra dar pra
 * estruturar e visualizar as telas antes de conectar o Supabase de verdade.
 * Basta preencher `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` (ver .env.example)
 * que o app volta a usar o Supabase real automaticamente — nenhum código
 * precisa mudar.
 */
export const IS_MOCK_MODE =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
