"use client";
import { AppShell } from "@/components/app-shell";

export default function AssignmentsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Задания</h1>
        <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          Домашние задания появятся позже.
        </p>
      </div>
    </AppShell>
  );
}