import { checkStorage } from "@/db";
import { configuredPublicOrigin } from "@/lib/public-url";
import { validateRuntimeSecrets } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    validateRuntimeSecrets();
    configuredPublicOrigin();
    await checkStorage();
    return Response.json(
      { status: "ok" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json(
      { status: "error" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
