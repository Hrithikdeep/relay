import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_ACCESS_COOKIE, isValidAccessCookie } from "@/lib/demoAccess";

// Temporary whole-app password gate - NOT real user auth, just keeps random
// internet traffic off the demo before real accounts/auth ship. Renamed
// from Next's old `middleware.ts` convention to `proxy.ts`, which this
// pinned Next.js version requires (middleware.ts is deprecated in v16).
//
// /login always renders, even with a valid cookie (re-login just resets it).
// Public: the landing page ("/") and "/login". Everything else (the
// dashboard and all (app) routes) needs the access cookie in production.
export function proxy(request: NextRequest) {
  const password = process.env.DEMO_ACCESS_PASSWORD;

  // Gate is a no-op if no password is configured.
  if (!password) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loggedIn = isValidAccessCookie(request.cookies.get(DEMO_ACCESS_COOKIE)?.value, password);

  if (pathname === "/" || pathname === "/login") return NextResponse.next();

  // Only real deployed environments show the password wall. `next dev`
  // always sets NODE_ENV to "development" internally regardless of what's
  // in .env.local, so this reliably distinguishes local dev from a real
  // deploy (Vercel, `next start`) without a separate flag.
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  if (loggedIn) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except the login form handler and static assets - those
    // must stay reachable or the gate can never be passed and CSS/JS/images
    // break even after logging in. "/" and "/login" are matched but let
    // through inside proxy().
    "/((?!api/access|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
