import { getDocument } from "@/lib/documents";
import { attachmentDisposition, getDocumentDownload } from "@/lib/downloads";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const document = await getDocument(id);
  if (!document) return new Response("Nie znaleziono", { status: 404 });

  try {
    const download = await getDocumentDownload(document);
    if (!download) return new Response("Nie znaleziono pliku", { status: 404 });

    const headers = new Headers({
      "cache-control": "private, no-store",
      "content-disposition": attachmentDisposition(download.filename),
      "content-length": String(download.bytes.byteLength),
      "content-type": download.contentType,
      "x-content-type-options": "nosniff",
    });
    return new Response(download.bytes, { headers });
  } catch (error) {
    console.error("Nie udało się przygotować pliku do pobrania.", error);
    return new Response("Nie udało się przygotować pliku", { status: 500 });
  }
}
