import { adminGuard } from "@/lib/auth";
import {
  deleteDocument,
  getDocument,
  getMarkdownContent,
  inputErrorResponse,
  publicDocument,
  updateMarkdown,
} from "@/lib/documents";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const denied = await adminGuard(request);
    if (denied) return denied;
    const { id } = await context.params;
    const document = await getDocument(id);
    if (!document) return Response.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
    const content = document.kind === "markdown" ? await getMarkdownContent(id) : undefined;
    return Response.json(
      { document: publicDocument(document, request), content },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return inputErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const denied = await adminGuard(request, { csrf: true });
    if (denied) return denied;
    const { id } = await context.params;
    const payload = (await request.json()) as { title?: unknown; content?: unknown };
    const document = await updateMarkdown(id, payload);
    return Response.json({ document: publicDocument(document, request) });
  } catch (error) {
    return inputErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const denied = await adminGuard(request, { csrf: true });
    if (denied) return denied;
    const { id } = await context.params;
    const deleted = await deleteDocument(id);
    if (!deleted) return Response.json({ error: "Nie znaleziono dokumentu." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
