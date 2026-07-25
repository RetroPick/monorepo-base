import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Optional gate: set OPS_STATIC_TOKEN in env and send Authorization: Bearer <token>.
 * Leave unset for local dev (same as prior MVP behavior).
 */
export function middleware(request: NextRequest) {
  const secret = process.env.OPS_STATIC_TOKEN?.trim();
  if (secret) {
    const auth = request.headers.get("authorization");
    const ok = auth === `Bearer ${secret}`;
    if (!ok) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const id = crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set("X-Request-ID", id);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
