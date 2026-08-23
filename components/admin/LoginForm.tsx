"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorId = "login-error";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.");
        return;
      }
      window.location.href = "/admin";
    } catch {
      setError("Nie udało się połączyć z serwerem. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit} aria-busy={busy}>
      <label htmlFor="admin-username">Login</label>
      <div className="input-with-icon">
        <UserRound size={17} aria-hidden="true" />
        <input
          id="admin-username"
          name="username"
          autoComplete="username"
          spellCheck={false}
          required
          placeholder="np. admin…"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>

      <label htmlFor="admin-password">Hasło</label>
      <div className="input-with-icon">
        <LockKeyhole size={17} aria-hidden="true" />
        <input
          id="admin-password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="current-password"
          required
          placeholder="Hasło administratora…"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          aria-pressed={showPassword}
        >
          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      {error && <p className="form-error" id={errorId} role="alert">{error}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={busy}>
        {busy ? <><LoaderCircle className="spin" size={18} aria-hidden="true" /> Logowanie…</> : <>Wejdź do panelu <ArrowRight size={18} aria-hidden="true" /></>}
      </button>
    </form>
  );
}
