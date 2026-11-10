"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, BookOpen, ClipboardList, ArrowUpRight } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login/"); return; }
      if (active) { setEmail(data.session.user.email ?? ""); setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [router]);

  const cards = [
    { title: "Расписание", desc: "Занятия по дням и неделям", href: "/schedule/", icon: CalendarDays },
    { title: "Библиотека", desc: "Лекции и учебные материалы", href: "/library/", icon: BookOpen },
    { title: "Задания", desc: "Работы и сроки сдачи", href: "/assignments/", icon: ClipboardList }
  ];

  return <PortalShell>
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">Личный кабинет</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Главная</h1>
        <p className="mt-2 text-slate-500">{loading ? "Загружаем профиль…" : email || (isSupabaseConfigured ? "Аккаунт Campus" : "Демо-режим настройки")}</p>
      </div>
      {!isSupabaseConfigured && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Подключите Supabase, чтобы включить регистрацию, вход и персональные данные. Инструкция находится в README.md.</div>}
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map(({ title, desc, href, icon: Icon }) => <a key={title} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="mb-8 flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon size={21}/></span><ArrowUpRight size={18} className="text-slate-400 group-hover:text-blue-600"/></div>
          <h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{desc}</p>
        </a>)}
      </section>
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Следующий шаг</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">После подключения базы данных здесь появятся ваша учебная группа, ближайшие занятия, новые материалы и активные задания.</p>
      </section>
    </div>
  </PortalShell>;
}
