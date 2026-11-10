"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

type Theme = "light" | "dark" | "system";

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) { setProfile(null); return; }
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!error && data) setProfile(data as Profile);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!error && data) setProfile(data as Profile);
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const theme = (profile?.theme as Theme) ?? "system";
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [profile?.theme]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const setTheme = useCallback(async (theme: Theme) => {
    if (!user) return;
    applyTheme(theme);
    setProfile((p) => (p ? { ...p, theme } : p));
    const { error } = await supabase.rpc("update_my_settings", { p_theme: theme });
    if (error) console.error(error.message);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}