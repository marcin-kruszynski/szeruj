import { adminGuard } from "@/lib/auth";
import {
  inputErrorResponse,
  publicDocument,
  regenerateDocumentLink,
} from "@/lib/documents";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const denied = await adminGuard(request, { csrf: true });
    if (denied) return denied;
    const { id } = await context.params;
    const document = await regenerateDocumentLink(id);
    return Response.json(
      { document: publicDocument(document, request) },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return inputErrorResponse(error);
  }
}
