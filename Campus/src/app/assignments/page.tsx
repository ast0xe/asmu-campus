import { PortalShell } from "@/components/portal-shell";
export default function AssignmentsPage() {
  return <PortalShell><h1 className="text-3xl font-bold">Задания</h1><p className="mt-2 text-slate-500">Здесь будут задания, сроки и статусы выполнения.</p><div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Активных заданий пока нет.</div></PortalShell>;
}
