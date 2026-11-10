"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { fmtTime, todayISO } from "@/lib/dates";

type Specialty = { id: string; code: string | null; name: string };
type Group = { id: string; name: string; course: number; specialty_id: string | null };
type Event = {
  id: string;
  subject_name: string | null;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher: string | null;
  lesson_type: string;
  status: string;
};

const typeLabel: Record<string, string> = {
  lecture: "Лекция",
  practice: "Практика",
  seminar: "Семинар",
  clinical: "Клинические",
  credit: "Зачёт с оценкой",
  training_practice: "Учебная практика",
  production_practice: "Производственная практика",
};

export default function DashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [course, setCourse] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [onbError, setOnbError] = useState<string | null>(null);

  const [groupName, setGroupName] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    supabase.from("specialties").select("id, code, name").order("name")
      .then(({ data }) => setSpecialties((data as Specialty[]) ?? []));
    supabase.from("study_groups").select("id, name, course, specialty_id").order("name")
      .then(({ data }) => setGroups((data as Group[]) ?? []));
  }, []);

  useEffect(() => {
    if (!profile?.group_id) { setEvents([]); return; }
    setScheduleLoading(true);
    supabase.from("study_groups").select("name").eq("id", profile.group_id).single()
      .then(({ data }) => setGroupName(data?.name ?? ""));
    supabase.from("schedule_events")
      .select("id, subject_name, start_time, end_time, room, teacher, lesson_type, status")
      .eq("group_id", profile.group_id)
      .eq("event_date", todayISO())
      .order("start_time")
      .then(({ data }) => { setEvents((data as Event[]) ?? []); setScheduleLoading(false); });
  }, [profile?.group_id]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (specialtyId && g.specialty_id !== specialtyId) return false;
      if (course && String(g.course) !== course) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [groups, specialtyId, course, search]);

  async function chooseGroup(groupId: string) {
    setSaving(true);
    setOnbError(null);
    const { error } = await supabase.rpc("set_my_group", { target_group_id: groupId });
    setSaving(false);
    if (error) setOnbError(error.message);
    else await refreshProfile();
  }

  if (!profile?.group_id) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Выбери свою группу</h1>
          <p className="mt-1 text-slate-500">После выбора покажем твоё расписание и материалы.</p>

          <label className="mt-6 block text-sm font-medium">Специальность</label>
          <select value={specialtyId} onChange={(e) => setSpecialtyId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
            <option value="">Все специальности</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="mt-4 block text-sm font-medium">Курс</label>
          <select value={course} onChange={(e) => setCourse(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3">
            <option value="">Все курсы</option>
            {[1, 2, 3, 4, 5, 6].map((c) => <option key={c} value={String(c)}>{c} курс</option>)}
          </select>

          <label className="mt-4 block text-sm font-medium">Поиск по названию группы</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Например: ЛД2511"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3" />

          {onbError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{onbError}</p>}

          <div className="mt-5 max-h-64 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
            {filteredGroups.length === 0 && <p className="p-4 text-sm text-slate-500">Группы не найдены</p>}
            {filteredGroups.map((g) => (
              <button key={g.id} type="button" disabled={saving} onClick={() => chooseGroup(g.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50">
                <span className="font-semibold">{g.name}</span>
                <span className="text-sm text-slate-500">{g.course} курс</span>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Привет, {profile.display_name || "студент"}!</h1>
        <p className="mt-1 text-slate-500">Группа: {groupName || "—"}</p>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Сегодня</h2>
          {scheduleLoading ? (
            <p className="mt-3 text-slate-500">Загружаем расписание…</p>
          ) : events.length === 0 ? (
            <p className="mt-3 text-slate-500">Сегодня занятий нет 🎉</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {events.map((ev) => (
                <li key={ev.id}
                  className={`flex items-center gap-4 rounded-2xl border border-slate-100 p-4 ${ev.status === "cancelled" ? "opacity-50 line-through" : ""}`}>
                  {ev.lesson_type === "lecture" && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-yellow-400 text-sm font-extrabold text-yellow-950">Л</span>
                  )}
                  <div className="w-20 shrink-0 text-sm font-semibold text-slate-700">
                    {fmtTime(ev.start_time)}–{fmtTime(ev.end_time)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{ev.subject_name || "Предмет"}</p>
                    <p className="text-sm text-slate-500">
                      {typeLabel[ev.lesson_type] ?? ev.lesson_type}
                      {ev.teacher ? ` · ${ev.teacher}` : ""}
                      {ev.room ? ` · ауд. ${ev.room}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/schedule/" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-200">
            <CalendarDays className="h-5 w-5 text-blue-600" /> <span className="font-semibold">Расписание</span>
          </Link>
          
          <Link href="/assignments/" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-200">
            <ClipboardList className="h-5 w-5 text-blue-600" /> <span className="font-semibold">Задания</span>
          </Link>
        </div>

        {profile.role === "admin" && (
          <Link href="/admin/" className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-200">
            <ShieldCheck className="h-5 w-5 text-blue-600" /> <span className="font-semibold">Админ-панель</span>
          </Link>
        )}
      </div>
    </AppShell>
  );
}