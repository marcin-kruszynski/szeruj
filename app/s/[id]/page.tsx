import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, ExternalLink, FileArchive, FileCode2, FileText } from "lucide-react";
import { Brand } from "@/components/Brand";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { MarkdownDocument } from "@/components/MarkdownDocument";
import { ThemePicker } from "@/components/ThemePicker";
import { getDocument, getMarkdownContent } from "@/lib/documents";
import { DOCUMENT_KIND_LABEL } from "@/lib/models";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function encodedPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) return { title: "Nie znaleziono dokumentu" };
  return {
    title: document.title,
    description: `${DOCUMENT_KIND_LABEL[document.kind]} udostępniony przez szeruj.`,
    robots: { index: false, follow: false },
  };
}

export default async function SharedDocumentPage({ params }: PageProps) {
  const { id } = await params;
  const document = await getDocument(id);
  if (!document) notFound();
  const markdown = document.kind === "markdown" ? await getMarkdownContent(id) : null;
  if (document.kind === "markdown" && markdown === null) notFound();

  const Icon = document.kind === "markdown" ? FileText : document.kind === "html" ? FileCode2 : FileArchive;
  const contentUrl = document.entryPath ? `/content/${id}/${encodedPath(document.entryPath)}` : null;

  return (
    <main className={`share-shell ${document.kind !== "markdown" ? "share-shell-html" : ""}`}>
      <header className="share-toolbar">
        <Brand />
        <div className="share-title">
          <span className="document-type-icon"><Icon size={17} /></span>
          <div><h1>{document.title}</h1><p>{DOCUMENT_KIND_LABEL[document.kind]}</p></div>
        </div>
        <div className="share-actions">
          {contentUrl && <a className="icon-button" href={contentUrl} target="_blank" rel="noreferrer" aria-label="Otwórz sam dokument"><ExternalLink size={17} /></a>}
          <a
            className="icon-button"
            href={`/s/${id}/download`}
            download
            aria-label={`Pobierz ${DOCUMENT_KIND_LABEL[document.kind]}`}
            title={`Pobierz ${DOCUMENT_KIND_LABEL[document.kind]}`}
          >
            <Download size={17} />
          </a>
          <ThemePicker compact />
          <CopyLinkButton compact />
        </div>
      </header>

      {document.kind === "markdown" ? (
        <div className="markdown-page"><MarkdownDocument content={markdown ?? ""} /></div>
      ) : (
        <div className="html-stage">
          <iframe
            src={contentUrl ?? undefined}
            title={document.title}
            sandbox="allow-scripts allow-modals allow-downloads"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </main>
  );
}
