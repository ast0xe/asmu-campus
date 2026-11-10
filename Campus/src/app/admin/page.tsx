"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarDays, GraduationCap, Search, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Specialty = { id: string; name: string; code: string | null };
type Group = { id: string; name: string; course: number; specialty_id: string | null };

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stats, setStats] = useState({ groups: 0, subjects: 0, events: 0, students: 0 });
  const [search, setSearch] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") router.replace("/dashboard/");
  }, [loading, profile, router]);

  const loadData = useCallback(async () => {
    const [specs, grps, subjCount, evCount, studCount] = await Promise.all([
      supabase.from("specialties").select("id,name,code").order("name"),
      supabase.from("study_groups").select("id,name,course,specialty_id").order("name"),
      supabase.from("subjects").select("*", { count: "exact", head: true }),
      supabase.from("schedule_events").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    ]);
    setSpecialties((specs.data as Specialty[]) ?? []);
    setGroups((grps.data as Group[]) ?? []);
    setStats({
      groups: (grps.data || []).length,
      subjects: subjCount.count ?? 0,
      events: evCount.count ?? 0,
      students: studCount.count ?? 0,
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (specialtyId && g.specialty_id !== specialtyId) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [groups, specialtyId, search]);

  const specialtyName = (id: string | null) => specialties.find((s) => s.id === id)?.name ?? "—";

  async function changeCourse(g: Group, course: number) {
    const { error } = await supabase.from("study_groups").update({ course }).eq("id", g.id);
    if (error) setError(error.message);
    else setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, course } : x)));
  }

  async function deleteGroup(g: Group) {
    if (!confirm(`Удалить группу ${g.name} и всё её расписание? Это необратимо.`)) return;
    setBusy(true);
    setError(null);
    const errs: string[] = [];
    const e0 = await supabase.from("profiles").update({ group_id: null }).eq("group_id", g.id);
    if (e0.error) errs.push("profiles: " + e0.error.message);
    const e1 = await supabase.from("schedule_events").delete().eq("group_id", g.id);
    if (e1.error) errs.push("schedule_events: " + e1.error.message);
    const e2 = await supabase.from("group_subjects").delete().eq("group_id", g.id);
    if (e2.error) errs.push("group_subjects: " + e2.error.message);
    const e3 = await supabase.from("study_groups").delete().eq("id", g.id);
    if (e3.error) errs.push("study_groups: " + e3.error.message);
    setBusy(false);
    if (errs.length) setError(errs.join(" | "));
    else {
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      setMsg(`Группа ${g.name} удалена`);
    }
  }

  if (loading) {
    return <AppShell><div className="grid min-h-[50vh] place-items-center text-slate-500">Загрузка…</div></AppShell>;
  }
  if (!profile || profile.role !== "admin") {
    return <AppShell><div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Нет доступа. Требуется роль администратора.</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold">Админ-панель</h1>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {msg && <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{msg}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={GraduationCap} label="Группы" value={stats.groups} />
          <StatCard icon={BookOpen} label="Дисциплины" value={stats.subjects} />
          <StatCard icon={CalendarDays} label="Занятия" value={stats.events} />
          <StatCard icon={Users} label="Студенты" value={stats.students} />
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-bold">Группы</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск группы"
                className="w-40 py-2.5 outline-none" />
            </div>
            <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <option value="">Все специальности</option>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Группа</th>
                  <th className="px-4 py-3 font-medium">Курс</th>
                  <th className="px-4 py-3 font-medium">Специальность</th>
                  <th className="px-4 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{g.name}</td>
                    <td className="px-4 py-3">
                      <select value={g.course} onChange={(e) => changeCourse(g, Number(e.target.value))}
                        className="rounded-lg border border-slate-200 px-2 py-1">
                        {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{specialtyName(g.specialty_id)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteGroup(g)} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" /> Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Группы не найдены</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}