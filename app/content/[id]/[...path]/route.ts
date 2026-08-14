import { getStoredFile } from "@/db";
import { normalizeArchivePath } from "@/lib/archive";
import { getDocument } from "@/lib/documents";
import { contentTypeForPath, isHtmlPath, isSvgPath } from "@/lib/mime";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; path: string[] }> };

const HTML_POLICY = [
  "sandbox allow-scripts allow-modals allow-downloads",
  "default-src 'self' https: http: data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: blob:",
  "style-src 'self' 'unsafe-inline' https: http:",
  "img-src 'self' https: http: data: blob:",
  "font-src 'self' https: http: data:",
  "media-src 'self' https: http: data: blob:",
  "connect-src 'self' https: http:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

export async function GET(_request: Request, context: RouteContext) {
  const { id, path: segments } = await context.params;
  const document = await getDocument(id);
  if (!document || document.kind === "markdown") return new Response("Nie znaleziono", { status: 404 });

  let path: string;
  try {
    path = normalizeArchivePath(segments.join("/"));
  } catch {
    return new Response("Nieprawidłowa ścieżka", { status: 400 });
  }
  if (document.kind === "html" && path !== document.entryPath) {
    return new Response("Nie znaleziono", { status: 404 });
  }

  const object = await getStoredFile(`documents/${id}/${path}`);
  if (!object) return new Response("Nie znaleziono", { status: 404 });

  const headers = new Headers();
  headers.set("content-type", contentTypeForPath(path));
  headers.set("content-disposition", `inline; filename*=UTF-8''${encodeURIComponent(path.split("/").pop() ?? "file")}`);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("cache-control", "public, max-age=60, must-revalidate");
  if (isHtmlPath(path)) {
    headers.set("content-security-policy", HTML_POLICY);
  } else if (isSvgPath(path)) {
    headers.set(
      "content-security-policy",
      "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; object-src 'none'"
    );
  }
  return new Response(object.body, { headers });
}
