#!/usr/bin/env node

import { constants as fsConstants } from "node:fs";
import { copyFile, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function parseArguments(argv) {
  const options = {
    source: path.resolve(".wrangler/state"),
    target: path.resolve("data"),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source" || argument === "--target") {
      const value = argv[index + 1];
      if (!value) throw new Error(`Brakuje wartości dla ${argument}.`);
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Nieznany argument: ${argument}`);
  }
  return options;
}

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const results = await Promise.all(
    entries.map(async (entry) => {
      const item = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(item) : entry.isFile() ? [item] : [];
    })
  );
  return results.flat();
}

function hasTable(databasePath, table) {
  let database;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const row = database.prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?"
    ).get(table);
    return Boolean(row);
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

function selectDatabase(paths, table) {
  const matches = paths.filter((item) => item.endsWith(".sqlite") && hasTable(item, table));
  if (matches.length !== 1) {
    throw new Error(
      `Oczekiwano jednej bazy z tabelą ${table}, znaleziono: ${matches.length}.`
    );
  }
  return matches[0];
}

function safeTarget(root, key) {
  if (!key || key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    throw new Error(`Niebezpieczny klucz R2: ${key}`);
  }
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Niebezpieczny klucz R2: ${key}`);
  }
  const target = path.resolve(root, ...segments);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Klucz R2 wychodzi poza magazyn: ${key}`);
  }
  return target;
}

async function copyBlob(source, target, expectedSize) {
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await copyFile(source, target, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const copied = await stat(target);
  if (copied.size !== expectedSize) {
    throw new Error(`Rozmiar pliku po migracji jest niepoprawny: ${target}`);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const sourceFiles = await walk(options.source);
  const d1Path = selectDatabase(sourceFiles, "documents");
  const r2Path = selectDatabase(sourceFiles, "_mf_objects");

  const d1 = new DatabaseSync(d1Path, { readOnly: true });
  const r2 = new DatabaseSync(r2Path, { readOnly: true });
  const documents = d1.prepare("SELECT * FROM documents ORDER BY created_at").all();
  const objects = r2.prepare(
    "SELECT key, blob_id, size FROM _mf_objects ORDER BY key"
  ).all();
  d1.close();
  r2.close();

  const blobPaths = new Map(
    sourceFiles
      .filter((item) => item.split(path.sep).includes("blobs"))
      .map((item) => [path.basename(item), item])
  );
  const documentIds = new Set(documents.map((document) => document.id));
  const selectedObjects = objects.filter((object) => {
    const match = /^documents\/([^/]+)\//.exec(object.key);
    return match && documentIds.has(match[1]);
  });

  if (documents.length === 0) throw new Error("Źródłowa baza nie zawiera dokumentów.");
  for (const object of selectedObjects) {
    if (!blobPaths.has(object.blob_id)) {
      throw new Error(`Brakuje bloba ${object.blob_id} dla ${object.key}.`);
    }
  }

  await mkdir(path.join(options.target, "files"), { recursive: true });
  const targetDatabasePath = path.join(options.target, "szeruj.sqlite");
  const targetDatabase = new DatabaseSync(targetDatabasePath);
  targetDatabase.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
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
  const insert = targetDatabase.prepare(`
    INSERT INTO documents (
      id, title, kind, original_name, entry_path, byte_size, file_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);
  for (const document of documents) {
    insert.run(
      document.id,
      document.title,
      document.kind,
      document.original_name,
      document.entry_path,
      document.byte_size,
      document.file_count,
      document.created_at,
      document.updated_at
    );
  }
  targetDatabase.close();

  for (const object of selectedObjects) {
    await copyBlob(
      blobPaths.get(object.blob_id),
      safeTarget(path.join(options.target, "files"), object.key),
      object.size
    );
  }

  await writeFile(
    path.join(options.target, "migration.json"),
    `${JSON.stringify(
      {
        source: options.source,
        migratedAt: new Date().toISOString(),
        documents: documents.length,
        files: selectedObjects.length,
      },
      null,
      2
    )}\n`,
    { encoding: "utf-8", flag: "wx" }
  ).catch((error) => {
    if (error.code !== "EEXIST") throw error;
  });

  console.log(`Zmigrowano dokumenty: ${documents.length}`);
  console.log(`Zmigrowano pliki: ${selectedObjects.length}`);
  console.log(`Katalog docelowy: ${options.target}`);
}

main().catch((error) => {
  console.error(`Migracja nie powiodła się: ${error.message}`);
  process.exitCode = 1;
});
