"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Monitor, Moon, Pencil, Sun } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Specialty = { id: string; name: string; code: string | null };
type Group = { id: string; name: string; course: number; specialty_id: string | null };
type Theme = "light" | "dark" | "system";

export default function ProfilePage() {
  const { profile, refreshProfile, signOut, setTheme } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [course, setCourse] = useState("");
  const [search, setSearch] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.group_id) {
      supabase.from("study_groups").select("name").eq("id", profile.group_id).single()
        .then(({ data }) => setGroupName(data?.name ?? ""));
    }
  }, [profile?.group_id]);

  useEffect(() => {
    if (showPicker) {
      supabase.from("specialties").select("id, code, name").order("name")
        .then(({ data }) => setSpecialties((data as Specialty[]) ?? []));
      supabase.from("study_groups").select("id, name, course, specialty_id").order("name")
        .then(({ data }) => setGroups((data as Group[]) ?? []));
    }
  }, [showPicker]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      if (specialtyId && g.specialty_id !== specialtyId) return false;
      if (course && String(g.course) !== course) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [groups, specialtyId, course, search]);

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase.rpc("update_my_settings", { p_display_name: name.trim() });
    setSavingName(false);
    if (error) setError(error.message);
    else { await refreshProfile(); setEditingName(false); setMsg("Имя обновлено"); }
  }

  async function chooseGroup(groupId: string) {
    setSavingGroup(true);
    setError(null);
    const { error } = await supabase.rpc("set_my_group", { target_group_id: groupId });
    setSavingGroup(false);
    if (error) setError(error.message);
    else {
      await refreshProfile();
      const g = groups.find((x) => x.id === groupId);
      setGroupName(g?.name ?? "");
      setShowPicker(false);
      setMsg("Группа обновлена");
    }
  }

  const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Светлая", icon: Sun },
    { id: "dark", label: "Тёмная", icon: Moon },
    { id: "system", label: "Системная", icon: Monitor },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold">Профиль</h1>

        {msg && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">{msg}</p>}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161d2a]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Имя</h2>
            {!editingName && (
              <button onClick={() => { setName(profile?.display_name ?? ""); setEditingName(true); }}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Pencil className="h-4 w-4" /> Изменить
              </button>
            )}
          </div>
          {editingName ? (
            <div className="mt-3 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
              <div className="flex gap-2">
                <button onClick={saveName} disabled={savingName}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Check className="h-4 w-4" /> Сохранить
                </button>
                <button onClick={() => setEditingName(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-lg font-semibold">{profile?.display_name || "—"}</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161d2a]">
          <h2 className="font-semibold">Группа</h2>
          <p className="mt-2 text-lg font-semibold">{groupName || "Не выбрана"}</p>
          {!showPicker ? (
            <button onClick={() => setShowPicker(true)}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700">
              Сменить группу
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="">Все специальности</option>
                  {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={course} onChange={(e) => setCourse(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <option value="">Все курсы</option>
                  {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={String(c)}>{c} курс</option>)}
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск"
                  className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {filtered.length === 0 && <p className="p-3 text-sm text-slate-500">Группы не найдены</p>}
                {filtered.map((g) => (
                  <button key={g.id} disabled={savingGroup} onClick={() => chooseGroup(g.id)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800">
                    <span className="font-semibold">{g.name}</span>
                    <span className="text-slate-500">{g.course} курс</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#161d2a]">
          <h2 className="font-semibold">Цветовая схема</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {themes.map((t) => {
              const Icon = t.icon;
              const active = (profile?.theme ?? "system") === t.id;
              return (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium ${active ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
                  <Icon className="h-5 w-5" /> {t.label}
                </button>
              );
            })}
          </div>
        </section>

        <button onClick={() => signOut()}
          className="w-full rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Выйти
        </button>
      </div>
    </AppShell>
  );
}