import type { Metadata } from "next";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/admin/LoginForm";
import { ThemePicker } from "@/components/ThemePicker";

export const metadata: Metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-top"><Brand /><ThemePicker compact /></div>
      <section className="login-card">
        <div className="login-heading">
          <span className="eyebrow">STREFA ZARZĄDZANIA</span>
          <h1>Dobrze Cię widzieć.</h1>
          <p>Zaloguj się, aby publikować i porządkować dokumenty.</p>
        </div>
        <LoginForm />
      </section>
      <p className="login-foot">szeruj · Twoje dokumenty, Twój serwer</p>
    </main>
  );
}
