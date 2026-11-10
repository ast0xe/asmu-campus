"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authErrorText } from "@/lib/auth-errors";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard/");
  }, [authLoading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(authErrorText(error.message));
    else router.replace("/dashboard/");
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-bold text-white">C</div>
        <h1 className="text-2xl font-bold">Вход</h1>
        <p className="mt-1 text-slate-500">Войди в свой аккаунт</p>

        <label className="mt-6 block text-sm font-medium">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="you@example.com" />

        <label className="mt-4 block text-sm font-medium">Пароль</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="••••••••" />

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={busy}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Входим…" : "Войти"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Нет аккаунта?{" "}
          <Link href="/register/" className="font-semibold text-blue-600">Регистрация</Link>
        </p>
      </form>
    </main>
  );
}
