import { Unzip, UnzipInflate } from "fflate";
import { contentTypeForPath, isHtmlPath } from "./mime";

export const UPLOAD_LIMITS = {
  singleFileBytes: 5 * 1024 * 1024,
  zipBytes: 15 * 1024 * 1024,
  expandedBytes: 50 * 1024 * 1024,
  archiveFileBytes: 12 * 1024 * 1024,
  archiveFiles: 250,
} as const;

export class DocumentInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DocumentInputError";
    this.status = status;
  }
}

export type ExtractedFile = {
  path: string;
  bytes: Uint8Array;
  contentType: string;
};

export type ExtractedBundle = {
  files: ExtractedFile[];
  entryPath: string;
  byteSize: number;
};

export function normalizeArchivePath(input: string) {
  if (!input || input.length > 512 || input.includes("\\") || input.includes("\0")) {
    throw new DocumentInputError("ZIP zawiera nieprawidłową ścieżkę pliku.");
  }
  if (input.startsWith("/") || /^[A-Za-z]:/.test(input)) {
    throw new DocumentInputError("ZIP nie może zawierać ścieżek bezwzględnych.");
  }

  const directory = input.endsWith("/");
  const parts = input.split("/");
  if (directory) parts.pop();
  if (
    parts.length === 0 ||
    parts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.length > 180 ||
        /[\u0000-\u001f\u007f]/.test(part)
    )
  ) {
    throw new DocumentInputError("ZIP zawiera niebezpieczną ścieżkę pliku.");
  }

  return `${parts.join("/")}${directory ? "/" : ""}`;
}

function joinChunks(chunks: Uint8Array[], size: number) {
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

export function extractHtmlBundle(archive: Uint8Array): ExtractedBundle {
  if (archive.byteLength > UPLOAD_LIMITS.zipBytes) {
    throw new DocumentInputError("ZIP jest za duży. Maksymalny rozmiar to 15 MB.", 413);
  }

  const files: ExtractedFile[] = [];
  const seenPaths = new Set<string>();
  let expandedBytes = 0;
  let declaredBytes = 0;
  let failure: Error | null = null;

  const unzip = new Unzip((file) => {
    if (failure) return;

    let path: string;
    try {
      path = normalizeArchivePath(file.name);
    } catch (error) {
      failure = error instanceof Error ? error : new Error("Nieprawidłowy ZIP.");
      return;
    }

    if (path.endsWith("/")) {
      file.ondata = (error) => {
        if (error && !failure) failure = error;
      };
      file.start();
      return;
    }

    if (file.compression !== 0 && file.compression !== 8) {
      failure = new DocumentInputError(
        `Nieobsługiwana metoda kompresji w pliku „${path}”.`
      );
      return;
    }
    if (seenPaths.has(path)) {
      failure = new DocumentInputError(`ZIP zawiera powtórzoną ścieżkę „${path}”.`);
      return;
    }
    if (seenPaths.size >= UPLOAD_LIMITS.archiveFiles) {
      failure = new DocumentInputError("ZIP zawiera zbyt wiele plików (maksymalnie 250).", 413);
      return;
    }
    if (file.originalSize !== undefined) {
      declaredBytes += file.originalSize;
      if (file.originalSize > UPLOAD_LIMITS.archiveFileBytes) {
        failure = new DocumentInputError(`Plik „${path}” po rozpakowaniu jest za duży.`, 413);
        return;
      }
      if (declaredBytes > UPLOAD_LIMITS.expandedBytes) {
        failure = new DocumentInputError("ZIP po rozpakowaniu przekracza limit 50 MB.", 413);
        return;
      }
    }

    seenPaths.add(path);
    const chunks: Uint8Array[] = [];
    let fileBytes = 0;
    file.ondata = (error, chunk, final) => {
      if (failure) return;
      if (error) {
        failure = error;
        return;
      }
      fileBytes += chunk.byteLength;
      expandedBytes += chunk.byteLength;
      if (fileBytes > UPLOAD_LIMITS.archiveFileBytes) {
        failure = new DocumentInputError(`Plik „${path}” po rozpakowaniu jest za duży.`, 413);
        file.terminate();
        return;
      }
      if (expandedBytes > UPLOAD_LIMITS.expandedBytes) {
        failure = new DocumentInputError("ZIP po rozpakowaniu przekracza limit 50 MB.", 413);
        file.terminate();
        return;
      }
      chunks.push(chunk.slice());
      if (final) {
        files.push({
          path,
          bytes: joinChunks(chunks, fileBytes),
          contentType: contentTypeForPath(path),
        });
      }
    };
    file.start();
  });

  unzip.register(UnzipInflate);
  try {
    unzip.push(archive, true);
  } catch (error) {
    if (!failure) {
      failure = error instanceof Error ? error : new Error("Nie udało się rozpakować ZIP-a.");
    }
  }

  if (failure) {
    if (failure instanceof DocumentInputError) throw failure;
    throw new DocumentInputError(`Nie udało się rozpakować ZIP-a: ${failure.message}`);
  }
  if (files.length === 0) {
    throw new DocumentInputError("ZIP jest pusty.");
  }

  const htmlFiles = files.filter((file) => isHtmlPath(file.path));
  if (htmlFiles.length === 0) {
    throw new DocumentInputError("ZIP musi zawierać co najmniej jeden plik HTML.");
  }

  const rootIndex = htmlFiles.find((file) => file.path.toLowerCase() === "index.html");
  const nestedIndexes = htmlFiles
    .filter((file) => /(^|\/)index\.html$/i.test(file.path))
    .sort((a, b) => a.path.length - b.path.length);
  const entryPath = rootIndex?.path ?? nestedIndexes[0]?.path ?? htmlFiles[0].path;

  return { files, entryPath, byteSize: expandedBytes };
}
