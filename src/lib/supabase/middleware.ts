import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

const protectedPrefixes = [
  "/apps",
  "/home",
  "/month",
  "/movements",
  "/control",
  "/transactions",
  "/target",
  "/plan",
  "/budget",
  "/import",
  "/review",
  "/rules",
  "/settings",
  "/dashboard",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isResetPassword = pathname.startsWith("/reset-password");
  const isProtectedRoute = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (!user && (isProtectedRoute || isResetPassword)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/apps";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/apps" : "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/dashboard") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (pathname === "/transactions") {
    const url = request.nextUrl.clone();
    url.pathname = "/movements";
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (pathname === "/budget" || pathname === "/plan") {
    const url = request.nextUrl.clone();
    url.pathname = "/target";
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  if (pathname === "/import") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.searchParams.set("import", "1");
    return NextResponse.redirect(url);
  }

  if (pathname === "/rules") {
    const url = request.nextUrl.clone();
    url.pathname = "/settings";
    url.searchParams.set("section", "rules");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
