"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, Home, LogOut, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard/", label: "Главная", icon: Home },
  { href: "/schedule/", label: "Расписание", icon: CalendarDays },
  { href: "/assignments/", label: "Задания", icon: ClipboardList },
  { href: "/profile/", label: "Профиль", icon: User },
];

function isActive(pathname: string, href: string) {
  const base = href.replace(/\/$/, "");
  return pathname === base || pathname.startsWith(base + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login/");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-slate-500">Загрузка…</div>;
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-[#161d2a]">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 font-bold text-white">C</div>
          <div>
            <p className="font-bold leading-tight">Campus</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.display_name || "студент"}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                <Icon className="h-5 w-5" /> {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin/"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${pathname.startsWith("/admin") ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
              <ShieldCheck className="h-5 w-5" /> Админка
            </Link>
          )}
        </nav>
        <div className="p-3">
          <button onClick={() => signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
            <LogOut className="h-5 w-5" /> Выйти
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-[#161d2a]">
        <span className="font-bold">Campus</span>
        <button onClick={() => signOut()} className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <LogOut className="h-4 w-4" /> Выйти
        </button>
      </header>

      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-8 md:pt-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-[#161d2a]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
              <Icon className="h-5 w-5" /> {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link href="/admin/"
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${pathname.startsWith("/admin") ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}>
            <ShieldCheck className="h-5 w-5" /> Админка
          </Link>
        )}
      </nav>
    </div>
  );
}