import type { Metadata } from "next";
import { FileArchive, FileCode2, FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/admin/LoginForm";
import { ThemePicker } from "@/components/ThemePicker";
import { currentRequestHasAdminSession } from "@/lib/current-session";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage() {
  if (await currentRequestHasAdminSession()) redirect("/admin");
  return (
    <main className="login-page" id="main-content">
      <div className="login-top"><Brand /><ThemePicker compact /></div>
      <section className="login-context" aria-labelledby="login-context-title">
        <h1 id="login-context-title">Wyniki agentów,<br />w jednym miejscu.</h1>
        <p>Publikuj, porządkuj i udostępniaj dokumenty bez osobnego repozytorium i procesu wdrożenia.</p>
        <div className="login-formats" aria-label="Obsługiwane formaty">
          <span><FileText size={16} aria-hidden="true" /> Markdown</span>
          <span><FileCode2 size={16} aria-hidden="true" /> HTML</span>
          <span><FileArchive size={16} aria-hidden="true" /> ZIP</span>
        </div>
      </section>
      <section className="login-card">
        <div className="login-heading">
          <h2>Zaloguj się</h2>
          <p>Panel jest dostępny tylko dla administratora tej instalacji.</p>
        </div>
        <LoginForm />
      </section>
      <p className="login-foot">szeruj · Twoje dokumenty, Twój serwer</p>
    </main>
  );
}
