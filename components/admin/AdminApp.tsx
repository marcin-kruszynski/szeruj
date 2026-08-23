"use client";

import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Clipboard,
  Download,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Brand } from "@/components/Brand";
import { MarkdownDocument } from "@/components/MarkdownDocument";
import { ThemePicker } from "@/components/ThemePicker";
import { copyText } from "@/lib/clipboard";
import { DOCUMENT_KIND_LABEL, type DocumentKind, type DocumentRecord } from "@/lib/models";

type PublicDocument = DocumentRecord & { url: string };
type Tab = "documents" | "new";
type KindFilter = DocumentKind | null;
type Notice = { message: string; tone: "success" | "error" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatFileCount(count: number) {
  if (count === 1) return "1 plik";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} pliki`;
  return `${count} plików`;
}

async function jsonResult<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }
  if (!response.ok) throw new Error(body.error ?? "Operacja nie powiodła się.");
  return body;
}

function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusableSelector = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]";
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));

    document.body.style.overflow = "hidden";
    queueMicrotask(() => (dialog.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0])?.focus());

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, ref]);
}

export function AdminApp({
  initialTab = "documents",
  initialQuery = "",
  initialKindFilter = null,
}: {
  initialTab?: Tab;
  initialQuery?: string;
  initialKindFilter?: KindFilter;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [kindFilter, setKindFilter] = useState<KindFilter>(initialKindFilter);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [editing, setEditing] = useState<PublicDocument | null>(null);
  const [deleting, setDeleting] = useState<PublicDocument | null>(null);
  const [removing, setRemoving] = useState(false);
  const [relinking, setRelinking] = useState<PublicDocument | null>(null);
  const [rotatingLink, setRotatingLink] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const notify = useCallback((message: string, tone: Notice["tone"] = "success") => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice({ message, tone });
    if (tone === "success") {
      noticeTimer.current = window.setTimeout(() => setNotice(null), 2800);
    }
  }, []);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await jsonResult<{ documents: PublicDocument[] }>(
        await fetch("/api/admin/documents", { cache: "no-store" })
      );
      setDocuments(result.documents);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nie udało się pobrać dokumentów.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab === "new") params.set("view", "new");
    if (query.trim()) params.set("q", query.trim());
    if (kindFilter) params.set("format", kindFilter);
    const search = params.toString();
    window.history.replaceState(null, "", `/admin${search ? `?${search}` : ""}`);
  }, [kindFilter, query, tab]);

  useEffect(() => {
    if (!menu) return;
    function closeMenu(event: PointerEvent) {
      const menuRoot = document.querySelector(`[data-row-menu-id="${menu}"]`);
      if (!menuRoot?.contains(event.target as Node)) setMenu(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => {
      if (kindFilter && document.kind !== kindFilter) return false;
      if (!needle) return true;
      return document.title.toLowerCase().includes(needle) || document.id.toLowerCase().includes(needle);
    });
  }, [documents, kindFilter, query]);

  async function copy(url: string) {
    try {
      await copyText(url);
      notify("Link skopiowany do schowka.");
    } catch {
      notify("Nie udało się skopiować linku. Skopiuj adres z paska przeglądarki.", "error");
    }
  }

  async function logout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch {
      notify("Nie udało się wylogować. Odśwież stronę i spróbuj ponownie.", "error");
    }
  }

  async function remove() {
    if (!deleting) return;
    setRemoving(true);
    try {
      const response = await fetch(`/api/admin/documents/${deleting.id}`, { method: "DELETE" });
      if (response.status === 401) { window.location.href = "/admin/login"; return; }
      if (!response.ok) throw new Error("Nie udało się usunąć dokumentu.");
      setDocuments((current) => current.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      notify("Dokument został usunięty.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nie udało się usunąć dokumentu.", "error");
    } finally {
      setRemoving(false);
    }
  }

  async function regenerateLink() {
    if (!relinking) return;
    setRotatingLink(true);
    try {
      const response = await fetch(`/api/admin/documents/${relinking.id}/link`, { method: "POST" });
      const result = await jsonResult<{ document: PublicDocument }>(response);
      setDocuments((items) => items.map((item) => item.id === relinking.id ? result.document : item));
      setRelinking(null);
      notify("Nowy link jest gotowy. Poprzedni adres przestał działać.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Nie udało się utworzyć nowego linku.", "error");
    } finally {
      setRotatingLink(false);
    }
  }

  return (
    <main className="admin-shell" id="main-content">
      <aside className="admin-sidebar">
        <Brand href="/admin" />
        <nav aria-label="Panel administratora">
          <button
            type="button"
            className={tab === "documents" ? "active" : ""}
            onClick={() => setTab("documents")}
            aria-pressed={tab === "documents"}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            <span className="nav-label">Dokumenty</span>
            <span className="nav-count">{documents.length}</span>
          </button>
          <button
            type="button"
            className={tab === "new" ? "active" : ""}
            onClick={() => setTab("new")}
            aria-pressed={tab === "new"}
          >
            <Plus size={18} aria-hidden="true" />
            <span className="nav-label">Nowy dokument</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <ThemePicker />
          <button type="button" onClick={() => void logout()}>
            <LogOut size={17} aria-hidden="true" /> <span>Wyloguj się</span>
          </button>
        </div>
      </aside>

      <section className="admin-content">
        {tab === "documents" ? (
          <>
            <h1 className="sr-only">Dokumenty</h1>
            <div className="library-toolbar">
              <label className="search-box">
                <span className="sr-only">Szukaj dokumentów</span>
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  name="document-search"
                  autoComplete="off"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj po tytule lub ID"
                />
              </label>
              <div className="format-filters" role="group" aria-label="Filtruj format dokumentów">
                {([
                  ["markdown", "Markdown"],
                  ["html", "HTML"],
                  ["bundle", "Pakiet"],
                ] as const).map(([kind, label]) => (
                  <button
                    key={kind}
                    className={kindFilter === kind ? "active" : ""}
                    type="button"
                    onClick={() => setKindFilter((current) => current === kind ? null : kind)}
                    aria-pressed={kindFilter === kind}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => void load()}
                aria-label={loading ? "Odświeżanie dokumentów" : "Odśwież dokumenty"}
                title="Odśwież dokumenty"
                disabled={loading}
              >
                <RefreshCw className={loading ? "spin" : undefined} size={17} />
              </button>
              <button className="button button-primary button-small" type="button" onClick={() => setTab("new")}>
                <Plus size={17} aria-hidden="true" /> Dodaj dokument
              </button>
            </div>

            <div className="document-table-wrap">
              {loading ? (
                <div className="table-skeleton" role="status" aria-label="Pobieranie dokumentów">
                  {[0, 1, 2, 3].map((row) => <span key={row} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="table-empty">
                  <FileText size={30} aria-hidden="true" />
                  <h2>{query || kindFilter ? "Brak dokumentów dla tych filtrów" : "Biblioteka jest pusta"}</h2>
                  <p>{query || kindFilter ? "Zmień frazę lub wyłącz filtr formatu." : "Dodaj Markdown, HTML albo ZIP, aby utworzyć pierwszy link."}</p>
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={() => {
                      if (query || kindFilter) {
                        setQuery("");
                        setKindFilter(null);
                      } else {
                        setTab("new");
                      }
                    }}
                  >
                    {query || kindFilter ? "Wyczyść filtry" : <><Plus size={16} aria-hidden="true" /> Dodaj pierwszy dokument</>}
                  </button>
                </div>
              ) : (
                <table className="document-table">
                  <thead>
                    <tr><th>Dokument</th><th>Format</th><th>Rozmiar</th><th>Utworzono</th><th><span className="sr-only">Akcje</span></th></tr>
                  </thead>
                  <tbody>{filtered.map((document) => {
                    const Icon = document.kind === "markdown" ? FileText : document.kind === "html" ? FileCode2 : FileArchive;
                    return (
                      <tr key={document.id}>
                        <td>
                          <div className="document-cell">
                            <div className={`table-doc-icon table-doc-${document.kind}`}><Icon size={18} aria-hidden="true" /></div>
                            <div className="document-info">
                              <a href={document.url} target="_blank" rel="noreferrer" title={document.title}>{document.title}</a>
                              <code>{document.id}</code>
                              <span className="document-mobile-meta">{DOCUMENT_KIND_LABEL[document.kind]} · {formatBytes(document.byteSize)}</span>
                            </div>
                          </div>
                        </td>
                        <td><span className={`kind-pill kind-${document.kind}`}>{DOCUMENT_KIND_LABEL[document.kind]}</span></td>
                        <td>{formatBytes(document.byteSize)}{document.kind === "bundle" && <small title="Liczba plików po rozpakowaniu ZIP-a">{formatFileCount(document.fileCount)} w ZIP-ie</small>}</td>
                        <td><time dateTime={document.createdAt}>{formatDate(document.createdAt)}</time></td>
                        <td className="table-actions" data-row-menu-id={document.id}>
                          <button type="button" onClick={() => void copy(document.url)} aria-label={`Kopiuj link do: ${document.title}`} title="Kopiuj link"><Clipboard size={17} /></button>
                          <a href={`/s/${document.id}/download`} download aria-label={`Pobierz: ${document.title}`} title="Pobierz dokument"><Download size={17} /></a>
                          <a href={document.url} target="_blank" rel="noreferrer" aria-label={`Otwórz: ${document.title}`} title="Otwórz dokument"><ArrowUpRight size={17} /></a>
                          <button
                            type="button"
                            onClick={() => setMenu(menu === document.id ? null : document.id)}
                            aria-label={`Więcej działań dla: ${document.title}`}
                            aria-expanded={menu === document.id}
                            aria-haspopup="menu"
                            title="Więcej działań"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {menu === document.id && (
                            <div className="row-menu" role="menu">
                              {document.kind === "markdown" && <button type="button" role="menuitem" onClick={() => { setEditing(document); setMenu(null); }}><Pencil size={15} aria-hidden="true" /> Edytuj Markdown</button>}
                              <button type="button" role="menuitem" onClick={() => { setRelinking(document); setMenu(null); }}><RefreshCw size={15} aria-hidden="true" /> Wylosuj nowy link</button>
                              <button type="button" role="menuitem" className="danger" onClick={() => { setDeleting(document); setMenu(null); }}><Trash2 size={15} aria-hidden="true" /> Usuń dokument</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <CreateDocument
            onCreated={(document) => {
              setDocuments((items) => [document, ...items]);
              setTab("documents");
              notify("Dokument opublikowany. Link jest gotowy.");
            }}
            onCancel={() => setTab("documents")}
          />
        )}
      </section>

      {notice && (
        <div className={`toast toast-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} aria-live={notice.tone === "error" ? "assertive" : "polite"}>
          {notice.tone === "error" ? <CircleAlert size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Zamknij powiadomienie"><X size={15} /></button>
        </div>
      )}
      {editing && (
        <EditMarkdown
          document={editing}
          onClose={() => setEditing(null)}
          onSaved={(document) => {
            setDocuments((items) => items.map((item) => item.id === document.id ? document : item));
            setEditing(null);
            notify("Zmiany zostały zapisane.");
          }}
        />
      )}
      {relinking && (
        <ConfirmRelink
          document={relinking}
          busy={rotatingLink}
          onCancel={() => setRelinking(null)}
          onConfirm={() => void regenerateLink()}
        />
      )}
      {deleting && (
        <ConfirmDelete
          document={deleting}
          busy={removing}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </main>
  );
}

function CreateDocument({ onCreated, onCancel }: { onCreated: (document: PublicDocument) => void; onCancel: () => void }) {
  const [mode, setMode] = useState<"markdown" | "upload">("markdown");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("# Nowy dokument\n\nZacznij pisać tutaj…");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let response: Response;
      if (mode === "markdown") {
        response = await fetch("/api/admin/documents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "markdown", title, content }),
        });
      } else {
        if (!file) throw new Error("Wybierz plik, który chcesz opublikować.");
        const isZip = /\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed";
        if (isZip) {
          const headers: Record<string, string> = {
            "content-type": "application/zip",
            "x-szeruj-filename": encodeURIComponent(file.name),
          };
          if (title.trim()) headers["x-szeruj-title"] = encodeURIComponent(title.trim());
          response = await fetch("/api/admin/documents", { method: "POST", headers, body: file });
        } else {
          const form = new FormData();
          form.set("title", title);
          form.set("file", file);
          response = await fetch("/api/admin/documents", { method: "POST", body: form });
        }
      }
      const result = await jsonResult<{ document: PublicDocument }>(response);
      onCreated(result.document);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się opublikować dokumentu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="create-view" onSubmit={submit} aria-busy={busy}>
      <header className="admin-heading">
        <div><h1>Dodaj dokument</h1><p>Napisz Markdown albo prześlij gotowy rezultat agenta.</p></div>
        <button type="button" className="button button-ghost" onClick={onCancel}>Anuluj</button>
      </header>

      <div className="create-modes" aria-label="Sposób dodawania dokumentu">
        <button type="button" aria-pressed={mode === "markdown"} className={mode === "markdown" ? "active" : ""} onClick={() => setMode("markdown")}>
          <FilePenLine size={20} aria-hidden="true" /><span><b>Napisz Markdown</b><small>Edytor i podgląd obok siebie</small></span>
        </button>
        <button type="button" aria-pressed={mode === "upload"} className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}>
          <UploadCloud size={20} aria-hidden="true" /><span><b>Prześlij plik</b><small>Markdown, HTML albo ZIP</small></span>
        </button>
      </div>

      <label className="field-label" htmlFor="document-title">
        <span>Tytuł <small>{mode === "upload" ? "opcjonalny" : ""}</small></span>
        <input
          id="document-title"
          name="title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={mode === "markdown" ? "Np. Analiza kampanii Q3" : "Jeśli pominiesz, użyjemy nazwy pliku"}
          maxLength={180}
        />
      </label>

      {mode === "markdown" ? (
        <div className="editor-grid">
          <label htmlFor="markdown-content"><span>Markdown</span><textarea id="markdown-content" name="content" value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /></label>
          <div><span>Podgląd</span><div className="editor-preview" aria-label="Podgląd dokumentu"><MarkdownDocument content={content} /></div></div>
        </div>
      ) : (
        <label className="drop-zone">
          <input
            type="file"
            name="file"
            accept=".md,.markdown,.html,.htm,.zip,text/markdown,text/html,application/zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            aria-describedby="upload-help"
          />
          <span className="drop-icon"><UploadCloud size={25} aria-hidden="true" /></span>
          <b>{file ? file.name : "Wybierz plik lub upuść go tutaj"}</b>
          <p id="upload-help">{file ? formatBytes(file.size) : ".md i .html do 5 MB · .zip do 100 MB"}</p>
        </label>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="create-footer">
        <p>Po publikacji od razu otrzymasz publiczny link.</p>
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle className="spin" size={18} aria-hidden="true" /> Publikowanie…</> : <><UploadCloud size={18} aria-hidden="true" /> Opublikuj</>}
        </button>
      </div>
    </form>
  );
}

function EditMarkdown({ document, onClose, onSaved }: { document: PublicDocument; onClose: () => void; onSaved: (document: PublicDocument) => void }) {
  const [title, setTitle] = useState(document.title);
  const [content, setContent] = useState("");
  const [baselineContent, setBaselineContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const dirty = !loading && (title !== document.title || content !== baselineContent);
  const requestClose = useCallback(() => {
    if (!dirty || window.confirm("Masz niezapisane zmiany. Zamknąć edytor i je odrzucić?")) {
      onClose();
    }
  }, [dirty, onClose]);
  useDialog(dialogRef, requestClose);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    void (async () => {
      try {
        const result = await jsonResult<{ content: string }>(await fetch(`/api/admin/documents/${document.id}`));
        setContent(result.content);
        setBaselineContent(result.content);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Nie udało się odczytać dokumentu.");
      } finally {
        setLoading(false);
      }
    })();
  }, [document.id]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = await jsonResult<{ document: PublicDocument }>(
        await fetch(`/api/admin/documents/${document.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, content }),
        })
      );
      onSaved(result.document);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zapisać zmian.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-dialog-heading" ref={dialogRef}>
        <header>
          <h2 className="sr-only" id="editor-dialog-heading">Edytuj Markdown: {document.title}</h2>
          <label className="modal-title-field" htmlFor="editor-document-title">
            <span className="sr-only">Tytuł dokumentu</span>
            <input id="editor-document-title" name="title" autoComplete="off" data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} disabled={loading} />
          </label>
          <button type="button" onClick={requestClose} className="icon-button" aria-label="Zamknij edytor" title="Zamknij"><X size={19} /></button>
        </header>
        {loading ? (
          <div className="modal-loading" role="status"><LoaderCircle className="spin" /><span>Wczytywanie dokumentu…</span></div>
        ) : (
          <div className="editor-grid modal-editor">
            <label htmlFor="edit-markdown"><span>Markdown</span><textarea id="edit-markdown" name="content" value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /></label>
            <div><span>Podgląd</span><div className="editor-preview"><MarkdownDocument content={content} /></div></div>
          </div>
        )}
        {error && <p className="form-error modal-error" role="alert">{error}</p>}
        <footer>
          <button className="button button-ghost" type="button" onClick={requestClose}>Anuluj</button>
          <button className="button button-primary" type="button" disabled={loading || saving} onClick={() => void save()}>
            {saving ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> Zapisywanie…</> : <><Check size={17} aria-hidden="true" /> Zapisz zmiany</>}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ConfirmRelink({ document, busy, onCancel, onConfirm }: { document: PublicDocument; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialog(dialogRef, onCancel);

  return (
    <div className="modal-backdrop">
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="relink-title" aria-describedby="relink-description" ref={dialogRef}>
        <div className="relink-icon"><RefreshCw size={22} aria-hidden="true" /></div>
        <h2 id="relink-title">Wylosować nowy link?</h2>
        <p id="relink-description">Stary adres dokumentu „{document.title}” natychmiast przestanie działać. Treść i pliki pozostaną bez zmian.</p>
        <div>
          <button className="button button-ghost" type="button" onClick={onCancel} data-autofocus disabled={busy}>Zostaw obecny link</button>
          <button className="button button-primary" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> Losowanie…</> : "Wylosuj nowy link"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmDelete({ document, busy, onCancel, onConfirm }: { document: PublicDocument; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialog(dialogRef, onCancel);

  return (
    <div className="modal-backdrop">
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" ref={dialogRef}>
        <div className="danger-icon"><Trash2 size={22} aria-hidden="true" /></div>
        <h2 id="delete-title">Usunąć dokument?</h2>
        <p id="delete-description">„{document.title}” i jego publiczny link znikną bezpowrotnie.</p>
        <div>
          <button className="button button-ghost" type="button" onClick={onCancel} data-autofocus disabled={busy}>Zostaw</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? <><LoaderCircle className="spin" size={17} aria-hidden="true" /> Usuwanie…</> : "Usuń dokument"}
          </button>
        </div>
      </section>
    </div>
  );
}
