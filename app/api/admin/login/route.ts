import { createAdminSessionCookie } from "@/lib/auth";
import { publicOrigin } from "@/lib/public-url";
import { requiredRuntimeValue, timingSafeEqual } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== publicOrigin(request)) {
      return Response.json({ error: "Żądanie zostało odrzucone." }, { status: 403 });
    }
    const payload = (await request.json()) as { username?: unknown; password?: unknown };
    const username = typeof payload.username === "string" ? payload.username : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const [validUser, validPassword] = await Promise.all([
      timingSafeEqual(username, requiredRuntimeValue("ADMIN_USERNAME")),
      timingSafeEqual(password, requiredRuntimeValue("ADMIN_PASSWORD")),
    ]);
    if (!validUser || !validPassword) {
      return Response.json({ error: "Nieprawidłowy login lub hasło." }, { status: 401 });
    }
    const response = Response.json({ ok: true });
    response.headers.set("set-cookie", await createAdminSessionCookie(request));
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Nie udało się zalogować." }, { status: 500 });
  }
}
