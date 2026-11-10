"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard/" : "/login/");
  }, [loading, user, router]);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <p className="text-slate-500">Загрузка…</p>
    </main>
  );
}
