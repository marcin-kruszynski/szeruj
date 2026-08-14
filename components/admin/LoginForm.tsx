"use client";

import { ArrowRight, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setBusy(false);
      setError(result.error ?? "Nie udało się zalogować.");
      return;
    }
    window.location.href = "/admin";
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label><span>Login</span><div className="input-with-icon"><UserRound size={17} /><input name="username" autoComplete="username" required autoFocus placeholder="admin" /></div></label>
      <label><span>Hasło</span><div className="input-with-icon"><LockKeyhole size={17} /><input type="password" name="password" autoComplete="current-password" required placeholder="••••••••••••" /></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} /> : <>Wejdź do panelu <ArrowRight size={18} /></>}
      </button>
    </form>
  );
}
