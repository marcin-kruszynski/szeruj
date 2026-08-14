import { adminGuard } from "@/lib/auth";
import {
  createDocument,
  inputErrorResponse,
  listDocuments,
  publicDocument,
} from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const denied = await adminGuard(request);
    if (denied) return denied;
    const rows = await listDocuments();
    return Response.json(
      { documents: rows.map((row) => publicDocument(row, request)) },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    return inputErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const denied = await adminGuard(request, { csrf: true });
    if (denied) return denied;
    const document = await createDocument(request);
    return Response.json({ document: publicDocument(document, request) }, { status: 201 });
  } catch (error) {
    return inputErrorResponse(error);
  }
}
