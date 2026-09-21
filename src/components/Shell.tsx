import { Link } from "@tanstack/react-router";
import { Cloud, CloudOff, RefreshCw, Moon, Sun, LogOut, Aperture } from "lucide-react";
import type { ReactNode } from "react";
import { ROLE_LABEL, useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

function StatusBadge() {
  const { status, pending, sync } = useApp();
  const map = {
    online: { label: "Online", icon: Cloud, cls: "text-success" },
    offline: { label: "Offline", icon: CloudOff, cls: "text-muted-foreground" },
    syncing: { label: "Syncing", icon: RefreshCw, cls: "text-warning" },
  } as const;
  const { label, icon: Icon, cls } = map[status];
  return (
    <button
      onClick={sync}
      className="flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold"
    >
      <Icon className={cn("size-4", cls, status === "syncing" && "animate-spin")} />
      <span>{label}</span>
      {pending > 0 && (
        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
          {pending}
        </span>
      )}
    </button>
  );
}

const TABS = [
  { to: "/", label: "Projects" },
  { to: "/log", label: "Log sheet" },
  { to: "/history", label: "History" },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { role, theme, toggleTheme, session, signOut } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Aperture className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">asmolog</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge />
            <span className="hidden h-11 items-center rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground sm:flex">
              {ROLE_LABEL[role]}
            </span>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid size-11 place-items-center rounded-full border border-border bg-card"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            {session && (
              <button
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="grid size-11 place-items-center rounded-full border border-border bg-card"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
          <nav className="flex w-full gap-2 overflow-x-auto pb-1">
            {TABS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: t.to === "/" }}
                className="flex h-11 items-center rounded-full px-5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
                activeProps={{ className: "bg-foreground text-background hover:bg-foreground" }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">{children}</main>
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-14 w-full rounded-2xl border border-input bg-card px-4 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";
