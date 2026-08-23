import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { ContextualBrand } from "@/components/ContextualBrand";

export default function NotFound() {
  return (
    <main className="centered-page" id="main-content">
      <ContextualBrand />
      <div className="empty-illustration"><FileQuestion size={32} aria-hidden="true" /></div>
      <p className="status-code">404</p>
      <h1>Nie ma tu takiego dokumentu.</h1>
      <p>Link może być niepełny albo dokument został usunięty przez administratora.</p>
      <Link className="button button-secondary" href="/"><ArrowLeft size={17} aria-hidden="true" /> Wróć na stronę główną</Link>
    </main>
  );
}
