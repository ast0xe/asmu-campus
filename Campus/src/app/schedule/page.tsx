"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { fmtTime } from "@/lib/dates";

type Event = {
  id: string;
  subject_name: string | null;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher: string | null;
  lesson_type: string;
  status: string;
  event_date: string;
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

const ruWeekdayShort = (d: Date) => ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][d.getDay()];
const ruMonths = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const ruMonthsGen = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

type View = "day" | "week" | "month";

export default function SchedulePage() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>("week");
  const [selected, setSelected] = useState<Date>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const { start, end } = useMemo(() => {
    if (view === "day") return { start: selected, end: selected };
    if (view === "week") {
      return {
        start: startOfWeek(selected, { weekStartsOn: 1 }),
        end: endOfWeek(selected, { weekStartsOn: 1 }),
      };
    }
    return { start: startOfMonth(selected), end: endOfMonth(selected) };
  }, [view, selected]);

  useEffect(() => {
    if (!profile?.group_id) return;
    setLoading(true);
    const s = format(start, "yyyy-MM-dd");
    const e = format(end, "yyyy-MM-dd");
    supabase.from("schedule_events")
      .select("id, subject_name, start_time, end_time, room, teacher, lesson_type, status, event_date")
      .eq("group_id", profile.group_id)
      .gte("event_date", s)
      .lte("event_date", e)
      .order("event_date")
      .order("start_time")
      .then(({ data }) => { setEvents((data as Event[]) ?? []); setLoading(false); });
  }, [profile?.group_id, start, end]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const ev of events) {
      const arr = map.get(ev.event_date) ?? [];
      arr.push(ev);
      map.set(ev.event_date, arr);
    }
    return map;
  }, [events]);

  function move(dir: number) {
    if (view === "day") setSelected((d) => addDays(d, dir));
    else if (view === "week") setSelected((d) => addDays(d, dir * 7));
    else setSelected((d) => addMonths(d, dir));
  }

  const periodLabel = (() => {
    if (view === "day") return `${selected.getDate()} ${ruMonthsGen[selected.getMonth()]} ${selected.getFullYear()}`;
    if (view === "week") {
      return `${start.getDate()} ${ruMonthsGen[start.getMonth()]} – ${end.getDate()} ${ruMonthsGen[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${ruMonths[selected.getMonth()]} ${selected.getFullYear()}`;
  })();

  const weekDays = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(selected, { weekStartsOn: 1 }),
      end: endOfWeek(selected, { weekStartsOn: 1 }),
    }),
    [selected]
  );

  const monthDays = useMemo(
    () => eachDayOfInterval({
      start: startOfWeek(startOfMonth(selected), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(selected), { weekStartsOn: 1 }),
    }),
    [selected]
  );

  const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

  function EventCard({ ev }: { ev: Event }) {
    return (
      <li className={`flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 ${ev.status === "cancelled" ? "opacity-50 line-through" : ""}`}>
        {ev.lesson_type === "lecture" && (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-yellow-400 text-sm font-extrabold text-yellow-950">Л</span>
           )}

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
    );
  }

  function MiniEvent({ ev }: { ev: Event }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs">
      {ev.lesson_type === "lecture" && (
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-yellow-400 text-[10px] font-extrabold text-yellow-950">Л</span>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-blue-800">{ev.lesson_type === "lecture" && <span className="mr-1 inline-grid h-3.5 w-3.5 place-items-center rounded bg-yellow-400 text-[9px] font-extrabold text-yellow-950">Л</span>}{ev.subject_name || "Пара"}</p>
        <p className="text-slate-500">{fmtTime(ev.start_time)}</p>
      </div>
    </div>
  );
}


  if (!profile?.group_id) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Сначала выбери свою группу на главной странице.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Расписание</h1>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${view === v ? "bg-blue-600 text-white" : "text-slate-600"}`}>
                {v === "day" ? "День" : v === "week" ? "Неделя" : "Месяц"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => setSelected(new Date())} className="text-sm font-semibold text-slate-700">
            {periodLabel}
          </button>
          <button onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {loading && <p className="mt-6 text-slate-500">Загружаем…</p>}

        {!loading && view === "day" && (
          <section className="mt-6">
            {events.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">В этот день занятий нет 🎉</p>
            ) : (
              <ul className="space-y-3">{events.map((ev) => <EventCard key={ev.id} ev={ev} />)}</ul>
            )}
          </section>
        )}

        {!loading && view === "week" && (
          <section className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-7">
            {weekDays.map((day) => {
              const list = eventsByDate.get(dayKey(day)) ?? [];
              return (
                <div key={dayKey(day)}
                  className={`rounded-2xl border p-3 ${isToday(day) ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
                  <div className="text-center">
                    <p className="text-xs uppercase text-slate-400">{ruWeekdayShort(day)}</p>
                    <p className={`text-lg font-bold ${isToday(day) ? "text-blue-600" : ""}`}>{day.getDate()}</p>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {list.length === 0
                      ? <p className="text-center text-xs text-slate-300">—</p>
                      : list.map((ev) => <MiniEvent key={ev.id} ev={ev} />)}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {!loading && view === "month" && (
          <section className="mt-6">
            <div className="grid grid-cols-7 gap-1">
              {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((w) => (
                <div key={w} className="py-1 text-center text-xs font-semibold text-slate-400">{w}</div>
              ))}
              {monthDays.map((day) => {
                const key = dayKey(day);
                const list = eventsByDate.get(key) ?? [];
                const inMonth = isSameMonth(day, selected);
                const active = isSameDay(day, selected);
                return (
                  <button key={key} onClick={() => setSelected(day)}
                    className={`flex min-h-12 flex-col items-center justify-center rounded-xl border text-sm
                      ${inMonth ? "border-slate-200 bg-white" : "border-transparent bg-transparent text-slate-300"}
                      ${active ? "ring-2 ring-blue-500" : ""}
                      ${isToday(day) ? "font-bold text-blue-600" : ""}`}>
                    <span>{day.getDate()}</span>
                    {list.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold">
                {selected.getDate()} {ruMonthsGen[selected.getMonth()]} {selected.getFullYear()}
              </h3>
              {(() => {
                const list = eventsByDate.get(dayKey(selected)) ?? [];
                return list.length === 0
                  ? <p className="mt-2 text-slate-500">В этот день занятий нет 🎉</p>
                  : <ul className="mt-3 space-y-3">{list.map((ev) => <EventCard key={ev.id} ev={ev} />)}</ul>;
              })()}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}