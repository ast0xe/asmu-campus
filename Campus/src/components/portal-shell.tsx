"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, ClipboardList, LayoutDashboard, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/dashboard/", label: "Главная", icon: LayoutDashboard },
  { href: "/schedule/", label: "Расписание", icon: CalendarDays },
  { href: "/library/", label: "Библиотека", icon: BookOpen },
  { href: "/assignments/", label: "Задания", icon: ClipboardList }
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  async function signOut() {
    await supabase?.auth.signOut();
    window.location.href = `${window.location.pathname.startsWith("/Campus") ? "/Campus" : ""}/login/`;
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="w-full border-b border-[var(--line)] bg-white p-4 md:fixed md:inset-y-0 md:w-64 md:border-b-0 md:border-r">
        <Link href="/dashboard/" className="mb-5 flex items-center gap-3 px-2 py-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">C</span>
          <span><b className="block text-lg">Campus</b><small className="text-slate-500">Студенческий портал</small></span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <button onClick={signOut} className="mt-5 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-slate-100 md:absolute md:bottom-5">
          <LogOut size={18} /> Выйти
        </button>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:ml-64 md:p-8">{children}</main>
    </div>
  );
}
