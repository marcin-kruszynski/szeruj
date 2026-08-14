import { hasAdminSession } from "@/lib/auth";
import { runtimeValue } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasAdminSession(request))) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json(
    { authenticated: true, username: runtimeValue("ADMIN_USERNAME") ?? "admin" },
    { headers: { "cache-control": "no-store" } }
  );
}
