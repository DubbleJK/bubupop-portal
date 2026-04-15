import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * API 응답 보안/캐시 정책
 * - API 본문은 민감 데이터가 섞일 수 있어 no-store 적용
 */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.set("Cache-Control", "no-store, max-age=0");

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};

