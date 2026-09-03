/**
 * Proxy (formerly "middleware") — the first authentication gate.
 *
 * It only checks that a *valid, unexpired* session cookie is present (cheap JWT
 * verify, no DB). Fine-grained permission checks happen in the API route guards
 * (`src/lib/auth/guard.ts`), which also re-load the user from MongoDB.
 *
 * - Browser navigation without a session  -> redirect to /login?next=<path>
 * - API request without a session          -> 401 JSON
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/** Paths reachable without a session. */
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  const nextPath = `${pathname}${search}`;
  if (nextPath && nextPath !== "/") loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  /**
   * Run on everything except Next internals and static assets. `/login` and
   * `/api/auth/login` are allowed through inside `proxy()` above.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|pdf|woff2?)$).*)"],
};
