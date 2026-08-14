import {
  deleteDocumentRecord,
  deleteStoredFiles,
  ensureSchema,
  getDocumentRecord,
  getStoredFile,
  insertDocumentRecord,
  listDocumentRecords,
  listStoredFileKeys,
  putStoredFile,
  updateDocumentRecord,
} from "@/db";
import { createDocumentId, isDocumentId } from "./ids";
import { contentTypeForPath } from "./mime";
import {
  DocumentInputError,
  extractHtmlBundle,
  UPLOAD_LIMITS,
  type ExtractedFile,
} from "./archive";
import type { DocumentKind, DocumentRecord } from "./models";
import { publicOrigin } from "./public-url";

type PreparedDocument = {
  title: string;
  kind: DocumentKind;
  originalName: string | null;
  entryPath: string | null;
  byteSize: number;
  files: ExtractedFile[];
};

const encoder = new TextEncoder();

function cleanTitle(value: unknown, fallback: string) {
  const title = typeof value === "string" ? value.trim() : "";
  const cleaned = (title || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!cleaned) throw new DocumentInputError("Tytuł jest wymagany.");
  if (cleaned.length > 180) throw new DocumentInputError("Tytuł może mieć maksymalnie 180 znaków.");
  return cleaned;
}

function titleFromFilename(filename: string) {
  const base = filename.split(/[\\/]/).pop()?.replace(/\.(md|markdown|html?|zip)$/i, "") ?? "Dokument";
  return base.replace(/[-_]+/g, " ").trim() || "Dokument";
}

function validateTextBytes(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new DocumentInputError("Plik tekstowy musi być zapisany w UTF-8.");
  }
}

function prepareText(kind: "markdown" | "html", title: unknown, content: unknown, originalName: string | null) {
  if (typeof content !== "string") throw new DocumentInputError("Treść dokumentu jest wymagana.");
  const bytes = encoder.encode(content);
  if (bytes.byteLength > UPLOAD_LIMITS.singleFileBytes) {
    throw new DocumentInputError("Plik jest za duży. Maksymalny rozmiar to 5 MB.", 413);
  }
  const filename = kind === "markdown" ? "source.md" : "index.html";
  return {
    title: cleanTitle(title, originalName ? titleFromFilename(originalName) : "Bez tytułu"),
    kind,
    originalName,
    entryPath: kind === "html" ? filename : null,
    byteSize: bytes.byteLength,
    files: [{ path: filename, bytes, contentType: contentTypeForPath(filename) }],
  } satisfies PreparedDocument;
}

async function prepareMultipart(request: Request): Promise<PreparedDocument> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > UPLOAD_LIMITS.zipBytes + 1024 * 1024) {
    throw new DocumentInputError("Przesyłany plik jest za duży.", 413);
  }
  const form = await request.formData();
  const item = form.get("file");
  if (!(item instanceof File)) throw new DocumentInputError("Pole „file” jest wymagane.");
  const originalName = item.name || "dokument";
  const title = form.get("title");
  const extension = originalName.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await item.arrayBuffer());

  if (extension === "zip" || item.type === "application/zip" || item.type === "application/x-zip-compressed") {
    const bundle = extractHtmlBundle(bytes);
    return {
      title: cleanTitle(title, titleFromFilename(originalName)),
      kind: "bundle",
      originalName,
      entryPath: bundle.entryPath,
      byteSize: bundle.byteSize,
      files: bundle.files,
    };
  }

  if (bytes.byteLength > UPLOAD_LIMITS.singleFileBytes) {
    throw new DocumentInputError("Plik jest za duży. Maksymalny rozmiar to 5 MB.", 413);
  }
  const content = validateTextBytes(bytes);
  if (extension === "md" || extension === "markdown" || item.type === "text/markdown") {
    return prepareText("markdown", title, content, originalName);
  }
  if (extension === "html" || extension === "htm" || item.type === "text/html") {
    return prepareText("html", title, content, originalName);
  }
  throw new DocumentInputError("Obsługiwane formaty to .md, .markdown, .html, .htm oraz .zip.");
}

async function prepareJson(request: Request): Promise<PreparedDocument> {
  const payload = (await request.json()) as { type?: unknown; title?: unknown; content?: unknown };
  if (payload.type !== "markdown" && payload.type !== "html") {
    throw new DocumentInputError("Pole „type” musi mieć wartość „markdown” albo „html”.");
  }
  return prepareText(payload.type, payload.title, payload.content, null);
}

async function prepareRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("multipart/form-data")) return prepareMultipart(request);
  if (contentType.includes("application/json")) return prepareJson(request);
  throw new DocumentInputError("Użyj application/json albo multipart/form-data.", 415);
}

async function putFiles(id: string, files: ExtractedFile[]) {
  const attempted: string[] = [];
  try {
    for (let offset = 0; offset < files.length; offset += 10) {
      const group = files.slice(offset, offset + 10);
      await Promise.all(
        group.map((file) => {
          const key = `documents/${id}/${file.path}`;
          attempted.push(key);
          return putStoredFile(key, file.bytes, file.contentType);
        })
      );
    }
  } catch (error) {
    if (attempted.length) await deleteStoredFiles(attempted).catch(() => undefined);
    throw error;
  }
}

export async function createDocument(request: Request) {
  const prepared = await prepareRequest(request);
  await ensureSchema();
  const id = createDocumentId();
  const now = new Date().toISOString();
  const record: DocumentRecord = {
    id,
    title: prepared.title,
    kind: prepared.kind,
    originalName: prepared.originalName,
    entryPath: prepared.entryPath,
    byteSize: prepared.byteSize,
    fileCount: prepared.files.length,
    createdAt: now,
    updatedAt: now,
  };
  await putFiles(id, prepared.files);

  try {
    return await insertDocumentRecord(record);
  } catch (error) {
    await deleteStoredFiles(
      prepared.files.map((file) => `documents/${id}/${file.path}`)
    ).catch(() => undefined);
    throw error;
  }
}

export async function listDocuments() {
  await ensureSchema();
  return listDocumentRecords();
}

export async function getDocument(id: string) {
  if (!isDocumentId(id)) return null;
  await ensureSchema();
  return getDocumentRecord(id);
}

export async function getMarkdownContent(id: string) {
  const object = await getStoredFile(`documents/${id}/source.md`);
  return object ? object.text() : null;
}

export async function updateMarkdown(id: string, input: { title?: unknown; content?: unknown }) {
  const record = await getDocument(id);
  if (!record) throw new DocumentInputError("Nie znaleziono dokumentu.", 404);
  if (record.kind !== "markdown") throw new DocumentInputError("Edytować można tylko dokumenty Markdown.", 409);
  const existing = await getMarkdownContent(id);
  const content = input.content === undefined ? existing : input.content;
  const prepared = prepareText("markdown", input.title ?? record.title, content, record.originalName);
  const now = new Date().toISOString();
  await putStoredFile(
    `documents/${id}/source.md`,
    prepared.files[0].bytes,
    prepared.files[0].contentType
  );
  const updated = await updateDocumentRecord(id, {
    title: prepared.title,
    byteSize: prepared.byteSize,
    updatedAt: now,
  });
  if (!updated) throw new DocumentInputError("Nie znaleziono dokumentu.", 404);
  return updated;
}

export async function deleteDocument(id: string) {
  const record = await getDocument(id);
  if (!record) return false;
  const keys = await listStoredFileKeys(`documents/${id}/`);
  if (keys.length) await deleteStoredFiles(keys);
  return deleteDocumentRecord(id);
}

export function publicDocument(record: DocumentRecord, request: Request) {
  return {
    ...record,
    url: new URL(`/s/${record.id}`, publicOrigin(request)).toString(),
  };
}

export function inputErrorResponse(error: unknown) {
  if (error instanceof DocumentInputError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Wystąpił nieoczekiwany błąd serwera." }, { status: 500 });
}
