"use client";

import {
  ArrowUpRight,
  Check,
  Clipboard,
  FileArchive,
  FileCode2,
  FilePenLine,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Brand } from "@/components/Brand";
import { MarkdownDocument } from "@/components/MarkdownDocument";
import { ThemePicker } from "@/components/ThemePicker";
import { copyText } from "@/lib/clipboard";
import { DOCUMENT_KIND_LABEL, type DocumentRecord } from "@/lib/models";

type PublicDocument = DocumentRecord & { url: string };
type Tab = "documents" | "new";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function jsonResult<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesja wygasła.");
  }
  if (!response.ok) throw new Error(body.error ?? "Operacja nie powiodła się.");
  return body;
}

export function AdminApp() {
  const [tab, setTab] = useState<Tab>("documents");
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<PublicDocument | null>(null);
  const [deleting, setDeleting] = useState<PublicDocument | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await jsonResult<{ documents: PublicDocument[] }>(await fetch("/api/admin/documents", { cache: "no-store" }));
      setDocuments(result.documents);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Nie udało się pobrać dokumentów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? documents.filter((doc) => doc.title.toLowerCase().includes(needle) || doc.id.toLowerCase().includes(needle)) : documents;
  }, [documents, query]);

  async function copy(url: string) {
    try {
      await copyText(url);
      setNotice("Link skopiowany do schowka.");
      window.setTimeout(() => setNotice(""), 2200);
    } catch {
      setNotice("Przeglądarka nie pozwoliła skopiować linku.");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  async function remove() {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/admin/documents/${deleting.id}`, { method: "DELETE" });
      if (response.status === 401) { window.location.href = "/admin/login"; return; }
      if (!response.ok) throw new Error("Nie udało się usunąć dokumentu.");
      setDocuments((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      setNotice("Dokument usunięty.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Nie udało się usunąć.");
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <nav aria-label="Panel administratora">
          <button className={tab === "documents" ? "active" : ""} onClick={() => setTab("documents")}><LayoutDashboard size={18} /> Dokumenty <span>{documents.length}</span></button>
          <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><Plus size={18} /> Nowy dokument</button>
        </nav>
        <div className="sidebar-bottom">
          <ThemePicker />
          <button onClick={logout}><LogOut size={17} /> Wyloguj się</button>
        </div>
      </aside>

      <section className="admin-content">
        {tab === "documents" ? (
          <>
            <header className="admin-heading">
              <div><p className="eyebrow">BIBLIOTEKA</p><h1>Dokumenty</h1><p>Wszystko, co aktualnie można otworzyć z publicznego linku.</p></div>
              <button className="button button-primary" onClick={() => setTab("new")}><Plus size={18} /> Dodaj dokument</button>
            </header>
            <div className="library-toolbar">
              <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po tytule lub ID…" /></label>
              <button className="icon-button" onClick={() => void load()} aria-label="Odśwież"><RefreshCw size={17} /></button>
            </div>
            <div className="document-table-wrap">
              {loading ? (
                <div className="table-empty"><LoaderCircle className="spin" size={28} /><p>Pobieram dokumenty…</p></div>
              ) : filtered.length === 0 ? (
                <div className="table-empty"><FileText size={30} /><h2>{query ? "Brak wyników" : "Tu pojawią się dokumenty"}</h2><p>{query ? "Spróbuj innej frazy." : "Dodaj pierwszy Markdown, HTML albo ZIP."}</p></div>
              ) : (
                <table className="document-table">
                  <thead><tr><th>Dokument</th><th>Format</th><th>Rozmiar</th><th>Utworzono</th><th><span className="sr-only">Akcje</span></th></tr></thead>
                  <tbody>{filtered.map((doc) => {
                    const Icon = doc.kind === "markdown" ? FileText : doc.kind === "html" ? FileCode2 : FileArchive;
                    return <tr key={doc.id}>
                      <td><div className={`table-doc-icon table-doc-${doc.kind}`}><Icon size={18} /></div><div><a href={doc.url} target="_blank" rel="noreferrer">{doc.title}</a><code>{doc.id}</code></div></td>
                      <td><span className={`kind-pill kind-${doc.kind}`}>{DOCUMENT_KIND_LABEL[doc.kind]}</span></td>
                      <td>{formatBytes(doc.byteSize)}{doc.kind === "bundle" && <small>{doc.fileCount} plików</small>}</td>
                      <td>{formatDate(doc.createdAt)}</td>
                      <td className="table-actions">
                        <button onClick={() => void copy(doc.url)} aria-label="Kopiuj link"><Clipboard size={17} /></button>
                        <a href={doc.url} target="_blank" rel="noreferrer" aria-label="Otwórz"><ArrowUpRight size={17} /></a>
                        <button onClick={() => setMenu(menu === doc.id ? null : doc.id)} aria-label="Więcej"><MoreHorizontal size={18} /></button>
                        {menu === doc.id && <div className="row-menu">
                          {doc.kind === "markdown" && <button onClick={() => { setEditing(doc); setMenu(null); }}><Pencil size={15} /> Edytuj Markdown</button>}
                          <button className="danger" onClick={() => { setDeleting(doc); setMenu(null); }}><Trash2 size={15} /> Usuń</button>
                        </div>}
                      </td>
                    </tr>;
                  })}</tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <CreateDocument onCreated={(doc) => { setDocuments((items) => [doc, ...items]); setTab("documents"); setNotice("Dokument opublikowany. Link jest gotowy."); }} onCancel={() => setTab("documents")} />
        )}
      </section>

      {notice && <div className="toast"><Check size={17} /> {notice}<button onClick={() => setNotice("")}><X size={15} /></button></div>}
      {editing && <EditMarkdown document={editing} onClose={() => setEditing(null)} onSaved={(doc) => { setDocuments((items) => items.map((item) => item.id === doc.id ? doc : item)); setEditing(null); setNotice("Zmiany zapisane."); }} />}
      {deleting && <ConfirmDelete document={deleting} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
    </main>
  );
}

function CreateDocument({ onCreated, onCancel }: { onCreated: (doc: PublicDocument) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"markdown" | "upload">("markdown");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("# Nowy dokument\n\nZacznij pisać tutaj…");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      let response: Response;
      if (mode === "markdown") {
        response = await fetch("/api/admin/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "markdown", title, content }) });
      } else {
        if (!file) throw new Error("Wybierz plik do przesłania.");
        const form = new FormData(); form.set("title", title); form.set("file", file);
        response = await fetch("/api/admin/documents", { method: "POST", body: form });
      }
      const result = await jsonResult<{ document: PublicDocument }>(response);
      onCreated(result.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się opublikować.");
    } finally { setBusy(false); }
  }

  return <form className="create-view" onSubmit={submit}>
    <header className="admin-heading"><div><p className="eyebrow">NOWA PUBLIKACJA</p><h1>Dodaj dokument</h1><p>Napisz Markdown od zera albo prześlij gotowy rezultat agenta.</p></div><button type="button" className="button button-ghost" onClick={onCancel}>Anuluj</button></header>
    <div className="create-modes">
      <button type="button" className={mode === "markdown" ? "active" : ""} onClick={() => setMode("markdown")}><FilePenLine size={20} /><span><b>Napisz Markdown</b><small>Edytor z podglądem na żywo</small></span></button>
      <button type="button" className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}><UploadCloud size={20} /><span><b>Prześlij plik</b><small>Markdown, HTML albo ZIP</small></span></button>
    </div>
    <label className="field-label"><span>Tytuł</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={mode === "markdown" ? "Np. Analiza kampanii Q3" : "Opcjonalnie — użyjemy nazwy pliku"} maxLength={180} /></label>
    {mode === "markdown" ? <div className="editor-grid"><label><span>Markdown</span><textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /></label><div><span>Podgląd</span><div className="editor-preview"><MarkdownDocument content={content} /></div></div></div> : <button type="button" className="drop-zone" onClick={() => fileRef.current?.click()}><input ref={fileRef} type="file" accept=".md,.markdown,.html,.htm,.zip,text/markdown,text/html,application/zip" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span className="drop-icon"><UploadCloud size={26} /></span><b>{file ? file.name : "Kliknij, aby wybrać plik"}</b><p>{file ? formatBytes(file.size) : ".md i .html do 5 MB · .zip do 15 MB"}</p></button>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="create-footer"><p>Po publikacji powstanie losowy publiczny link.</p><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <><UploadCloud size={18} /> Opublikuj</>}</button></div>
  </form>;
}

function EditMarkdown({ document, onClose, onSaved }: { document: PublicDocument; onClose: () => void; onSaved: (doc: PublicDocument) => void }) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => { try { const result = await jsonResult<{ content: string }>(await fetch(`/api/admin/documents/${document.id}`)); setContent(result.content); } catch (err) { setError(err instanceof Error ? err.message : "Błąd odczytu."); } finally { setBusy(false); } })(); }, [document.id]);
  async function save() { setBusy(true); setError(""); try { const result = await jsonResult<{ document: PublicDocument }>(await fetch(`/api/admin/documents/${document.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, content }) })); onSaved(result.document); } catch (err) { setError(err instanceof Error ? err.message : "Nie udało się zapisać."); setBusy(false); } }
  return <div className="modal-backdrop"><section className="editor-modal" role="dialog" aria-modal="true" aria-label="Edytuj Markdown"><header><div><p className="eyebrow">EDYCJA MARKDOWN</p><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} /></div><button onClick={onClose} className="icon-button" aria-label="Zamknij"><X size={19} /></button></header>{busy && !content ? <div className="modal-loading"><LoaderCircle className="spin" /></div> : <div className="editor-grid modal-editor"><label><span>Markdown</span><textarea value={content} onChange={(event) => setContent(event.target.value)} /></label><div><span>Podgląd</span><div className="editor-preview"><MarkdownDocument content={content} /></div></div></div>}{error && <p className="form-error">{error}</p>}<footer><button className="button button-ghost" onClick={onClose}>Anuluj</button><button className="button button-primary" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle className="spin" size={17} /> : <><Check size={17} /> Zapisz zmiany</>}</button></footer></section></div>;
}

function ConfirmDelete({ document, onCancel, onConfirm }: { document: PublicDocument; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><section className="confirm-modal" role="alertdialog" aria-modal="true"><div className="danger-icon"><Trash2 size={22} /></div><h2>Usunąć dokument?</h2><p>„{document.title}” i jego publiczny link znikną bezpowrotnie.</p><div><button className="button button-ghost" onClick={onCancel}>Zostaw</button><button className="button button-danger" onClick={onConfirm}>Usuń dokument</button></div></section></div>;
}
