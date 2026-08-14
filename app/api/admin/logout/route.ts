import { adminGuard, clearAdminSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await adminGuard(request, { csrf: true });
  if (denied) return denied;
  const response = Response.json({ ok: true });
  response.headers.set("set-cookie", clearAdminSessionCookie(request));
  response.headers.set("cache-control", "no-store");
  return response;
}
