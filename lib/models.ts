export type DocumentKind = "markdown" | "html" | "bundle";

export type DocumentRecord = {
  id: string;
  title: string;
  kind: DocumentKind;
  originalName: string | null;
  entryPath: string | null;
  byteSize: number;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  markdown: "Markdown",
  html: "HTML",
  bundle: "Pakiet HTML",
};
