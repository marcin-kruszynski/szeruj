import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { documents } from "./schema";
import type { DocumentRecord } from "@/lib/models";
import type { StorageBackend } from "./types";

type CloudflareBindings = {
  DB: D1Database;
  FILES: R2Bucket;
};

function bindings() {
  return env as unknown as CloudflareBindings;
}

function database() {
  const { DB } = bindings();
  if (!DB) throw new Error("Cloudflare D1 binding `DB` jest niedostępny.");
  return drizzle(DB, { schema: { documents } });
}

function bucket() {
  const { FILES } = bindings();
  if (!FILES) throw new Error("Cloudflare R2 binding `FILES` jest niedostępny.");
  return FILES;
}

export const cloudflareStorage: StorageBackend = {
  async ensureSchema() {
    const { DB } = bindings();
    if (!DB) throw new Error("Cloudflare D1 binding `DB` jest niedostępny.");
    await DB.batch([
      DB.prepare(`CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('markdown', 'html', 'bundle')),
        original_name TEXT,
        entry_path TEXT,
        byte_size INTEGER NOT NULL,
        file_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      DB.prepare(
        "CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents (created_at DESC)"
      ),
    ]);
  },

  async insertDocument(record) {
    const [created] = await database().insert(documents).values(record).returning();
    return created as DocumentRecord;
  },

  async listDocuments() {
    return await database().select().from(documents).orderBy(desc(documents.createdAt)).limit(500) as DocumentRecord[];
  },

  async getDocument(id) {
    const [record] = await database().select().from(documents).where(eq(documents.id, id)).limit(1);
    return (record as DocumentRecord | undefined) ?? null;
  },

  async updateDocument(id, changes) {
    const [updated] = await database()
      .update(documents)
      .set(changes)
      .where(eq(documents.id, id))
      .returning();
    return (updated as DocumentRecord | undefined) ?? null;
  },

  async deleteDocument(id) {
    const result = await database().delete(documents).where(eq(documents.id, id)).returning({ id: documents.id });
    return result.length > 0;
  },

  async putFile(key, bytes, contentType) {
    await bucket().put(key, bytes, { httpMetadata: { contentType } });
  },

  async getFile(key) {
    const object = await bucket().get(key);
    if (!object) return null;
    return {
      body: object.body as unknown as BodyInit,
      text: () => object.text(),
    };
  },

  async deleteFiles(keys) {
    if (keys.length) await bucket().delete(keys);
  },

  async listFileKeys(prefix) {
    const keys: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await bucket().list({ prefix, cursor, limit: 500 });
      keys.push(...page.objects.map((object) => object.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return keys;
  },

  async health() {
    const { DB } = bindings();
    if (!DB) throw new Error("Cloudflare D1 binding `DB` jest niedostępny.");
    await DB.prepare("SELECT 1").first();
  },
};
