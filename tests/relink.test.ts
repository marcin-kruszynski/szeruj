import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { strToU8, zipSync } from "fflate";

test("regenerates a bundle link and moves every stored file", async (context) => {
  const dataDirectory = await mkdtemp(path.join(os.tmpdir(), "szeruj-relink-"));
  process.env.SZERUJ_DATA_DIR = dataDirectory;
  context.after(async () => rm(dataDirectory, { recursive: true, force: true }));

  const { getStoredFile, listStoredFileKeys } = await import("../db/index");
  const {
    createDocument,
    deleteDocument,
    getDocument,
    regenerateDocumentLink,
  } = await import("../lib/documents");
  const { getDocumentDownload } = await import("../lib/downloads");

  const archive = zipSync({
    "index.html": strToU8("<link rel=\"stylesheet\" href=\"assets/app.css\"><h1>Raport</h1>"),
    "assets/app.css": strToU8("body { color: tomato; }"),
  });
  const created = await createDocument(
    new Request("http://szeruj.local/api/v1/documents", {
      method: "POST",
      headers: {
        "content-type": "application/zip",
        "content-length": String(archive.byteLength),
        "x-szeruj-filename": "raport.zip",
      },
      body: archive,
    })
  );

  const updated = await regenerateDocumentLink(created.id);
  assert.notEqual(updated.id, created.id);
  assert.equal(updated.title, created.title);
  assert.equal(updated.fileCount, 2);
  assert.equal(await getDocument(created.id), null);
  assert.equal((await getDocument(updated.id))?.id, updated.id);
  assert.deepEqual(await listStoredFileKeys(`documents/${created.id}/`), []);
  assert.equal((await listStoredFileKeys(`documents/${updated.id}/`)).length, 2);
  assert.equal(await getStoredFile(`archives/${created.id}.zip`), null);
  assert.deepEqual((await getStoredFile(`archives/${updated.id}.zip`))?.bytes, archive);

  const download = await getDocumentDownload(updated);
  assert.deepEqual(download?.bytes, archive);
  assert.equal(await deleteDocument(updated.id), true);
});
