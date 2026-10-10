import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { pendingCount, subscribeTakes, syncNow, type SyncStatus } from "./sync";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export type Role = "admin" | "dit" | "viewer";

interface AppState {
  session: Session | null;
  authReady: boolean;
  role: Role;
  status: SyncStatus;
  pending: number;
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  refreshPending: () => void;
  sync: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<Role>("admin");
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [activeProjectId, setActive] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const refreshPending = useCallback(() => {
    void pendingCount().then(setPending);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await syncNow();
    } catch (e) {
      console.error("sync failed", e);
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setActive(localStorage.getItem("asmolog.project"));
    const savedTheme = (localStorage.getItem("asmolog.theme") as "light" | "dark") ?? "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void sync();
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) void sync();
    });

    const on = () => {
      setOnline(true);
      void sync();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    refreshPending();
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [sync, refreshPending]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (cancelled || !data?.length) return;
        const roles = data.map((r) => r.role as Role);
        setRole(roles.includes("admin") ? "admin" : roles.includes("dit") ? "dit" : "viewer");
      });
    const unsub = subscribeTakes();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [session]);

  const setActiveProjectId = (id: string | null) => {
    setActive(id);
    if (id) localStorage.setItem("asmolog.project", id);
    else localStorage.removeItem("asmolog.project");
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("asmolog.theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const status: SyncStatus = !online ? "offline" : syncing ? "syncing" : "online";

  return (
    <Ctx.Provider
      value={{
        session,
        authReady,
        role,
        status,
        pending,
        activeProjectId,
        setActiveProjectId,
        refreshPending,
        sync: () => void sync(),
        theme,
        toggleTheme,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  dit: "DIT / Clapper",
  viewer: "Viewer / Client",
};

export const canEdit = (role: Role) => role !== "viewer";
