import { apiTokenGuard } from "@/lib/auth";
import { createDocument, inputErrorResponse, publicDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const denied = await apiTokenGuard(request);
    if (denied) return denied;
    const document = await createDocument(request);
    return Response.json({ document: publicDocument(document, request) }, { status: 201 });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
