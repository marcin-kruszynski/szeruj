import { zipSync } from "fflate";
import { getStoredFile, listStoredFileKeys } from "@/db";
import type { DocumentKind, DocumentRecord } from "./models";

type DownloadableDocument = Pick<
  DocumentRecord,
  "id" | "title" | "kind" | "originalName" | "entryPath"
>;

type DownloadFile = {
  path: string;
  bytes: Uint8Array;
};

export type DocumentDownload = {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
};

const DOWNLOAD_FORMAT: Record<
  DocumentKind,
  { contentType: string; extension: string; originalExtension: RegExp }
> = {
  markdown: {
    contentType: "text/markdown; charset=utf-8",
    extension: ".md",
    originalExtension: /\.(?:md|markdown)$/i,
  },
  html: {
    contentType: "text/html; charset=utf-8",
    extension: ".html",
    originalExtension: /\.html?$/i,
  },
  bundle: {
    contentType: "application/zip",
    extension: ".zip",
    originalExtension: /\.zip$/i,
  },
};

function safeFileComponent(value: string, basenameOnly = false) {
  const candidate = basenameOnly ? value.split(/[\\/]/).pop() ?? "" : value;
  return candidate
    .normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 160);
}

export function downloadFilename(document: DownloadableDocument) {
  const format = DOWNLOAD_FORMAT[document.kind];
  const original = safeFileComponent(document.originalName ?? "", true);
  if (original && format.originalExtension.test(original)) return original;

  const preferred = original || safeFileComponent(document.title) || `document-${document.id}`;
  const stem = preferred.replace(/\.(?:md|markdown|html?|zip)$/i, "") || `document-${document.id}`;
  return `${stem}${format.extension}`;
}

function rfc5987Value(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

export function attachmentDisposition(filename: string) {
  const fallback = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987Value(filename)}`;
}

export function zipDownloadFiles(files: DownloadFile[]) {
  const entries: Record<string, Uint8Array> = Object.create(null);
  for (const file of files) entries[file.path] = file.bytes;
  return zipSync(entries, { level: 6 });
}

async function reconstructedBundle(document: DownloadableDocument) {
  const prefix = `documents/${document.id}/`;
  const keys = (await listStoredFileKeys(prefix)).sort();
  if (keys.length === 0) return null;

  const files: DownloadFile[] = [];
  for (let offset = 0; offset < keys.length; offset += 10) {
    const group = keys.slice(offset, offset + 10);
    const stored = await Promise.all(
      group.map(async (key) => ({ key, file: await getStoredFile(key) }))
    );
    for (const item of stored) {
      if (!item.file || !item.key.startsWith(prefix)) return null;
      files.push({ path: item.key.slice(prefix.length), bytes: item.file.bytes });
    }
  }
  return zipDownloadFiles(files);
}

export async function getDocumentDownload(
  document: DownloadableDocument
): Promise<DocumentDownload | null> {
  const format = DOWNLOAD_FORMAT[document.kind];
  let bytes: Uint8Array | null = null;

  if (document.kind === "bundle") {
    const originalArchive = await getStoredFile(`archives/${document.id}.zip`);
    bytes = originalArchive?.bytes ?? (await reconstructedBundle(document));
  } else {
    const path = document.kind === "markdown" ? "source.md" : document.entryPath ?? "index.html";
    const file = await getStoredFile(`documents/${document.id}/${path}`);
    bytes = file?.bytes ?? null;
  }

  if (!bytes) return null;
  return {
    bytes,
    contentType: format.contentType,
    filename: downloadFilename(document),
  };
}
