import { PortalShell } from "@/components/portal-shell";
export default function SchedulePage() {
  return <PortalShell><h1 className="text-3xl font-bold">Расписание</h1><p className="mt-2 text-slate-500">Раздел подготовлен. Следующий этап — календарь занятий, недели и числитель/знаменатель.</p><div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Пока нет загруженного расписания.</div></PortalShell>;
}
