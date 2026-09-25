import { Link } from "@tanstack/react-router";
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Moon,
  Sun,
  LogOut,
  Aperture,
  Clapperboard,
  PlusCircle,
  Clock,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { to: "/", label: "Projects", icon: Clapperboard },
  { to: "/log", label: "Log Sheet", icon: PlusCircle },
  { to: "/history", label: "History", icon: Clock },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const { role, theme, toggleTheme, session, signOut } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Aperture className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">asmolog</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge />
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid size-11 place-items-center rounded-full border border-border bg-card"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Profile"
                  className="grid size-11 place-items-center rounded-full bg-foreground text-sm font-extrabold uppercase text-background"
                >
                  {(session.user.email ?? "?").charAt(0)}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
                  <DropdownMenuLabel>
                    <span className="block truncate text-sm">{session.user.email}</span>
                    <span className="block text-xs font-medium text-muted-foreground">
                      {ROLE_LABEL[role]}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()} className="h-11 rounded-xl">
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/auth"
                aria-label="Sign in"
                className="grid size-11 place-items-center rounded-full border border-border bg-card"
              >
                <UserRound className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 sm:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-xl grid-cols-3 gap-1 px-3 py-2">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold text-muted-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-8 w-14 place-items-center rounded-full transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
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
