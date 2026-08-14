import type { DocumentRecord } from "@/lib/models";

export type StoredFile = {
  body: BodyInit;
  text(): Promise<string>;
};

export type DocumentUpdate = Pick<DocumentRecord, "title" | "byteSize" | "updatedAt">;

export interface StorageBackend {
  ensureSchema(): Promise<void>;
  insertDocument(record: DocumentRecord): Promise<DocumentRecord>;
  listDocuments(): Promise<DocumentRecord[]>;
  getDocument(id: string): Promise<DocumentRecord | null>;
  updateDocument(id: string, changes: DocumentUpdate): Promise<DocumentRecord | null>;
  deleteDocument(id: string): Promise<boolean>;
  putFile(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  getFile(key: string): Promise<StoredFile | null>;
  deleteFiles(keys: string[]): Promise<void>;
  listFileKeys(prefix: string): Promise<string[]>;
  health(): Promise<void>;
}
