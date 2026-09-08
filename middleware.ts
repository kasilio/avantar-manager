import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { IS_MOCK_MODE } from "@/lib/supabase/is-mock-mode";

export async function middleware(request: NextRequest) {
  if (IS_MOCK_MODE) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
