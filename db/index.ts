import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DocumentKind, DocumentRecord } from "@/lib/models";

type DocumentRow = {
  id: string;
  title: string;
  kind: DocumentKind;
  original_name: string | null;
  entry_path: string | null;
  byte_size: number;
  file_count: number;
  created_at: string;
  updated_at: string;
};

export type StoredFile = {
  body: BodyInit;
  bytes: Uint8Array;
  text(): Promise<string>;
};

let databaseInstance: DatabaseSync | undefined;
let schemaReady = false;

function dataDirectory() {
  const configured = process.env.SZERUJ_DATA_DIR?.trim();
  return path.resolve(configured || path.join(process.cwd(), ".szeruj-data"));
}

function filesDirectory() {
  return path.join(dataDirectory(), "files");
}

function database() {
  if (databaseInstance) return databaseInstance;
  databaseInstance = new DatabaseSync(path.join(dataDirectory(), "szeruj.sqlite"));
  databaseInstance.exec("PRAGMA journal_mode = WAL");
  databaseInstance.exec("PRAGMA synchronous = NORMAL");
  databaseInstance.exec("PRAGMA busy_timeout = 5000");
  databaseInstance.exec("PRAGMA foreign_keys = ON");
  return databaseInstance;
}

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    originalName: row.original_name,
    entryPath: row.entry_path,
    byteSize: row.byte_size,
    fileCount: row.file_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureSchema() {
  if (schemaReady) return;
  await mkdir(filesDirectory(), { recursive: true });
  database().exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('markdown', 'html', 'bundle')),
      original_name TEXT,
      entry_path TEXT,
      byte_size INTEGER NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS documents_created_at_idx
      ON documents (created_at DESC);
  `);
  schemaReady = true;
}

function safeStoragePath(key: string) {
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    throw new Error("Nieprawidłowy klucz pliku.");
  }
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Nieprawidłowy klucz pliku.");
  }
  const root = filesDirectory();
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Klucz pliku wychodzi poza magazyn.");
  }
  return resolved;
}

async function removeEmptyParents(start: string) {
  const root = filesDirectory();
  let current = start;
  while (current !== root && current.startsWith(`${root}${path.sep}`)) {
    try {
      await rmdir(current);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        current = path.dirname(current);
        continue;
      }
      if (code === "ENOTEMPTY" || code === "EEXIST") return;
      throw error;
    }
    current = path.dirname(current);
  }
}

async function walkFiles(directory: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const item = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(item);
      return entry.isFile() ? [item] : [];
    })
  );
  return nested.flat();
}

export async function insertDocumentRecord(record: DocumentRecord) {
  await ensureSchema();
  database().prepare(`
    INSERT INTO documents (
      id, title, kind, original_name, entry_path, byte_size, file_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.title,
    record.kind,
    record.originalName,
    record.entryPath,
    record.byteSize,
    record.fileCount,
    record.createdAt,
    record.updatedAt
  );
  return record;
}

export async function listDocumentRecords() {
  await ensureSchema();
  const rows = database().prepare(
    "SELECT * FROM documents ORDER BY created_at DESC LIMIT 500"
  ).all() as unknown as DocumentRow[];
  return rows.map(mapDocument);
}

export async function getDocumentRecord(id: string) {
  await ensureSchema();
  const row = database().prepare(
    "SELECT * FROM documents WHERE id = ? LIMIT 1"
  ).get(id) as unknown as DocumentRow | undefined;
  return row ? mapDocument(row) : null;
}

export async function updateDocumentRecord(
  id: string,
  changes: Pick<DocumentRecord, "title" | "byteSize" | "updatedAt">
) {
  await ensureSchema();
  const result = database().prepare(`
    UPDATE documents
    SET title = ?, byte_size = ?, updated_at = ?
    WHERE id = ?
  `).run(changes.title, changes.byteSize, changes.updatedAt, id);
  if (result.changes === 0) return null;
  const row = database().prepare("SELECT * FROM documents WHERE id = ?").get(id);
  return mapDocument(row as unknown as DocumentRow);
}

export async function deleteDocumentRecord(id: string) {
  await ensureSchema();
  return database().prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
}

export async function putStoredFile(
  key: string,
  bytes: Uint8Array,
  contentType: string
) {
  void contentType;
  await ensureSchema();
  const target = safeStoragePath(key);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function getStoredFile(key: string): Promise<StoredFile | null> {
  await ensureSchema();
  try {
    const buffer = await readFile(safeStoragePath(key));
    const bytes = new Uint8Array(buffer.byteLength);
    bytes.set(buffer);
    return {
      body: bytes,
      bytes,
      text: async () => new TextDecoder().decode(bytes),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteStoredFiles(keys: string[]) {
  await ensureSchema();
  for (const key of keys) {
    const target = safeStoragePath(key);
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await removeEmptyParents(path.dirname(target));
  }
}

export async function listStoredFileKeys(prefix: string) {
  await ensureSchema();
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const directory = safeStoragePath(normalizedPrefix);
  const paths = await walkFiles(directory);
  const root = filesDirectory();
  return paths.map((item) => path.relative(root, item).split(path.sep).join("/"));
}

export async function checkStorage() {
  await ensureSchema();
  database().prepare("SELECT 1").get();
}
