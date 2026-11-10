"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authErrorText } from "@/lib/auth-errors";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setBusy(false);
    if (error) setError(authErrorText(error.message));
    else if (data.session) router.replace("/dashboard/");
    else setInfo("Готово! Подтверди email по ссылке в письме, затем войди.");
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-bold text-white">C</div>
        <h1 className="text-2xl font-bold">Регистрация</h1>
        <p className="mt-1 text-slate-500">Создай аккаунт студента</p>

        <label className="mt-6 block text-sm font-medium">Имя</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Иван" />

        <label className="mt-4 block text-sm font-medium">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="you@example.com" />

        <label className="mt-4 block text-sm font-medium">Пароль</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Минимум 6 символов" />

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {info && <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</p>}

        <button type="submit" disabled={busy}
          className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? "Создаём…" : "Зарегистрироваться"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Уже есть аккаунт?{" "}
          <Link href="/login/" className="font-semibold text-blue-600">Войти</Link>
        </p>
      </form>
    </main>
  );
}
