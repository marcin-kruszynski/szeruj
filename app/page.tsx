import Link from "next/link";
import {
  ArrowUpRight,
  FileArchive,
  FileCode2,
  FileText,
  LockKeyhole,
  Palette,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { ThemePicker } from "@/components/ThemePicker";

export default function Home() {
  return (
    <main className="landing-shell">
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
          <div className="eyebrow"><Sparkles size={15} /> Dokument gotowy do pokazania</div>
          <h1>Wrzuć. Otwórz.<br /><span>Szeruj.</span></h1>
          <p>
            Markdown, gotowy HTML albo cały pakiet z grafikami. Jeden estetyczny,
            trudny do odgadnięcia link — i można wysyłać dalej.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/admin/login">
              Otwórz panel <ArrowUpRight size={18} />
            </Link>
            <a className="button button-secondary" href="#jak-dziala">Jak to działa</a>
          </div>
          <div className="hero-assurance">
            <LockKeyhole size={16} /> 132 bity losowości w każdym publicznym adresie
          </div>
        </div>

        <div className="hero-document" aria-label="Przykładowy dokument Markdown">
          <div className="mock-window-bar">
            <div className="mock-dots"><i /><i /><i /></div>
            <span>analiza-produktu.md</span>
            <span className="mock-badge">MD</span>
          </div>
          <article className="mock-paper">
            <div className="mock-kicker">RAPORT / 12 SIERPNIA</div>
            <h2>Agent właśnie skończył pracę.</h2>
            <p className="mock-lead">Teraz wynik wygląda równie dobrze, jak zawartość.</p>
            <div className="mock-callout"><Sparkles size={17} /><p><b>Najważniejszy wniosek</b><br />Wszystko jest gotowe do udostępnienia.</p></div>
            <div className="mock-grid">
              <div><span>01</span><b>Czytelny Markdown</b><p>Nagłówki, tabele i kod.</p></div>
              <div><span>02</span><b>Żywy HTML</b><p>Wykresy i interakcje.</p></div>
            </div>
            <div className="mock-code"><span>POST</span> /api/v1/documents <i>201</i></div>
          </article>
          <div className="floating-theme"><Palette size={16} /> 10 motywów</div>
        </div>
      </section>

      <section className="how-section" id="jak-dziala">
        <div className="section-heading">
          <span>Prosty przepływ</span>
          <h2>Jeden adres dla każdego rezultatu.</h2>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-markdown">
            <div className="feature-icon"><FileText size={22} /></div>
            <span className="feature-number">01</span>
            <h3>Markdown, który chce się czytać</h3>
            <p>Typografia, tabele, checklisty i kolorowanie kodu reagują na wybrany motyw.</p>
          </article>
          <article className="feature-card feature-html">
            <div className="feature-icon"><FileCode2 size={22} /></div>
            <span className="feature-number">02</span>
            <h3>HTML działa, ale jest odizolowany</h3>
            <p>Interaktywne raporty uruchamiają się w bezpiecznej piaskownicy, poza panelem admina.</p>
          </article>
          <article className="feature-card feature-zip">
            <div className="feature-icon"><FileArchive size={22} /></div>
            <span className="feature-number">03</span>
            <h3>ZIP zachowuje całą oprawę</h3>
            <p>CSS, JavaScript, fonty i grafiki trafiają razem z plikiem startowym HTML.</p>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <Brand />
        <p>Otwarte, lekkie i zrobione dla ludzi oraz ich agentów.</p>
      </footer>
    </main>
  );
}
