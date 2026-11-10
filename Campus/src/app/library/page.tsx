import { PortalShell } from "@/components/portal-shell";
export default function LibraryPage() {
  return <PortalShell><h1 className="text-3xl font-bold">Библиотека</h1><p className="mt-2 text-slate-500">Материалы будут сгруппированы по дисциплинам и темам.</p><div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">Материалы пока не добавлены.</div></PortalShell>;
}
