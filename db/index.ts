import type { DocumentRecord } from "@/lib/models";
import type { StorageBackend, StoredFile } from "./types";

let backendPromise: Promise<StorageBackend> | undefined;

function configuredDriver() {
  const value = process.env.SZERUJ_STORAGE_DRIVER?.trim().toLowerCase() || "node";
  if (value !== "node" && value !== "cloudflare") {
    throw new Error(`Nieobsługiwany SZERUJ_STORAGE_DRIVER: ${value}.`);
  }
  return value;
}

function getBackend() {
  backendPromise ??= configuredDriver() === "cloudflare"
    ? import("./cloudflare").then((module) => module.cloudflareStorage)
    : import("./node").then((module) => module.nodeStorage);
  return backendPromise;
}

export async function ensureSchema() {
  await (await getBackend()).ensureSchema();
}

export async function insertDocumentRecord(record: DocumentRecord) {
  return (await getBackend()).insertDocument(record);
}

export async function listDocumentRecords() {
  return (await getBackend()).listDocuments();
}

export async function getDocumentRecord(id: string) {
  return (await getBackend()).getDocument(id);
}

export async function updateDocumentRecord(
  id: string,
  changes: Pick<DocumentRecord, "title" | "byteSize" | "updatedAt">
) {
  return (await getBackend()).updateDocument(id, changes);
}

export async function deleteDocumentRecord(id: string) {
  return (await getBackend()).deleteDocument(id);
}

export async function putStoredFile(key: string, bytes: Uint8Array, contentType: string) {
  await (await getBackend()).putFile(key, bytes, contentType);
}

export async function getStoredFile(key: string): Promise<StoredFile | null> {
  return (await getBackend()).getFile(key);
}

export async function deleteStoredFiles(keys: string[]) {
  await (await getBackend()).deleteFiles(keys);
}

export async function listStoredFileKeys(prefix: string) {
  return (await getBackend()).listFileKeys(prefix);
}

export async function checkStorage() {
  await (await getBackend()).health();
}
