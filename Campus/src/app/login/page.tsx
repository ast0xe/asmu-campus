"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(error.message);
    else router.push("/dashboard/");
  }

  return <main className="grid min-h-screen place-items-center p-5">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-7"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-bold text-white">C</div><h1 className="text-2xl font-bold">Вход в Campus</h1><p className="mt-2 text-sm text-slate-500">Войдите, чтобы открыть учебный портал.</p></div>
      {!isSupabaseConfigured && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Сначала заполните переменные Supabase в .env.local.</p>}
      <label className="mb-2 block text-sm font-medium">Электронная почта</label>
      <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
      <label className="mb-2 block text-sm font-medium">Пароль</label>
      <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <button disabled={busy || !isSupabaseConfigured} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Входим…" : "Войти"}</button>
      <p className="mt-5 text-center text-sm text-slate-500">Нет аккаунта? <Link className="font-semibold text-blue-600" href="/register/">Зарегистрироваться</Link></p>
    </form>
  </main>;
}
