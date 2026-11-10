import Link from "next/link";

export default function Home() {
  return <main className="grid min-h-screen place-items-center p-6">
    <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-xl font-bold text-white">C</div>
      <h1 className="text-3xl font-bold">Campus</h1>
      <p className="mt-2 text-slate-500">Студенческий портал: расписание, материалы и задания.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white" href="/login/">Войти</Link>
        <Link className="rounded-xl border border-slate-200 px-5 py-3 font-semibold" href="/register/">Регистрация</Link>
      </div>
    </div>
  </main>;
}
