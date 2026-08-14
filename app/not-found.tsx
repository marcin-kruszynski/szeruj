import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Brand } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="centered-page">
      <Brand />
      <div className="empty-illustration"><FileQuestion size={36} /></div>
      <p className="eyebrow">404 / PUSTA PÓŁKA</p>
      <h1>Nie ma tu takiego dokumentu.</h1>
      <p>Link może być niepełny albo dokument został usunięty przez administratora.</p>
      <Link className="button button-secondary" href="/"><ArrowLeft size={17} /> Wróć na stronę główną</Link>
    </main>
  );
}
