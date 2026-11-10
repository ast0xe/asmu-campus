"use client";

import { useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else setMessage("Аккаунт создан. Если в Supabase включено подтверждение почты, проверьте входящие письма.");
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Регистрация</h1>
      <p className="mb-7 mt-2 text-sm text-slate-500">Создайте аккаунт студента Campus.</p>
      {!isSupabaseConfigured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Сначала заполните переменные Supabase в .env.local.</p>}
      <label className="mb-2 block text-sm font-medium">Электронная почта</label>
      <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3" />
      <label className="mb-2 block text-sm font-medium">Пароль (не менее 8 символов)</label>
      <input required minLength={8} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3" />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}
      <button disabled={busy || !isSupabaseConfigured} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Создаём…" : "Создать аккаунт"}</button>
      <p className="mt-5 text-center text-sm text-slate-500">Уже зарегистрированы? <Link className="font-semibold text-blue-600" href="/login/">Войти</Link></p>
    </form>
  </main>;
}
