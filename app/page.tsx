import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  FileArchive,
  FileCode2,
  FileText,
  LockKeyhole,
  Send,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemePicker } from "@/components/ThemePicker";
import { currentRequestHasAdminSession } from "@/lib/current-session";

export default async function Home() {
  if (await currentRequestHasAdminSession()) redirect("/admin");
  return (
    <main className="landing-shell" id="main-content">
      <nav className="site-nav" aria-label="Główna nawigacja">
        <Brand />
        <div className="nav-actions">
          <ThemePicker compact />
          <Link className="button button-ghost button-small" href="/admin/login">
            Panel admina
          </Link>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <h1>Gotowy wynik.<br /><span>Jeden link.</span></h1>
          <p>
            Wyślij Markdown, HTML albo cały pakiet z zasobami. Szeruj przechowa
            rezultat, dobrze go pokaże i od razu odda adres do udostępnienia.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/admin/login">
              Przejdź do panelu <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <a className="button button-secondary" href="#jak-dziala">Jak to działa</a>
          </div>
          <div className="hero-assurance">
            <LockKeyhole size={16} aria-hidden="true" /> Bez repozytorium, builda i osobnego wdrożenia
          </div>
        </div>

        <div className="hero-document" aria-label="Przykładowy dokument Markdown" aria-hidden="true">
          <div className="mock-window-bar">
            <div className="mock-dots"><i /><i /><i /></div>
            <span>analiza-produktu.md</span>
            <span className="mock-badge">MD</span>
          </div>
          <article className="mock-paper">
            <div className="mock-kicker">RAPORT / 12 SIERPNIA</div>
            <h2>Agent właśnie skończył pracę.</h2>
            <p className="mock-lead">Teraz wynik wygląda równie dobrze, jak zawartość.</p>
            <div className="mock-callout"><Send size={17} /><p><b>Gotowe do wysłania</b><br />Pełna treść, kod i zasoby są pod jednym adresem.</p></div>
            <div className="mock-grid">
              <div><span>01</span><b>Czytelny Markdown</b><p>Nagłówki, tabele i kod.</p></div>
              <div><span>02</span><b>Żywy HTML</b><p>Wykresy i interakcje.</p></div>
            </div>
            <div className="mock-code"><span>POST</span> /api/v1/documents <i>201</i></div>
          </article>
        </div>
      </section>

      <section className="how-section" id="jak-dziala">
        <div className="section-heading">
          <h2>Od pliku do linku, bez dodatkowego projektu.</h2>
          <p>Jedna usługa obsługuje trzy najczęstsze rezultaty pracy agentów.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-markdown">
            <div className="feature-icon"><FileText size={22} aria-hidden="true" /></div>
            <span className="feature-label">Markdown</span>
            <h3>Dokument, który chce się czytać</h3>
            <p>Rozbudowana typografia, tabele, checklisty i kod. Treść możesz później edytować w panelu.</p>
          </article>
          <article className="feature-card feature-html">
            <div className="feature-icon"><FileCode2 size={22} aria-hidden="true" /></div>
            <span className="feature-label">HTML</span>
            <h3>Gotowa strona pozostaje interaktywna</h3>
            <p>Wykresy i interakcje działają w odizolowanej ramce, bez ingerencji w interfejs Szeruj.</p>
          </article>
          <article className="feature-card feature-zip">
            <div className="feature-icon"><FileArchive size={22} aria-hidden="true" /></div>
            <span className="feature-label">ZIP do 100 MB</span>
            <h3>Wszystkie zasoby jadą razem</h3>
            <p>CSS, JavaScript, fonty, grafiki i dodatkowe dane zostają w jednej kompletnej paczce.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <Brand />
        <p>Własny serwer. Jedno API. Gotowy link.</p>
      </footer>
    </main>
  );
}
