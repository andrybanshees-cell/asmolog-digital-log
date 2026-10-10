import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { inputCls } from "./Shell";
import { useApp } from "@/lib/app-context";
import { syncNow } from "@/lib/sync";
import type { Project } from "@/lib/db";
import {
  inviteMember,
  listMembers,
  PROJECT_ROLE_LABEL,
  removeMember,
  updateMemberRole,
  type Member,
  type ProjectRole,
} from "@/lib/team";
import { cn } from "@/lib/utils";

const ROLES: ProjectRole[] = ["admin", "editor", "viewer"];

export function TeamSection({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  const { session, status } = useApp();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("editor");
  const [busy, setBusy] = useState(false);
  const offline = status === "offline";

  const load = useCallback(() => {
    if (!session || offline) return;
    listMembers(project.id).then(setMembers).catch(() => setMembers([]));
  }, [project.id, session, offline]);
  useEffect(load, [load]);

  if (!session) {
    return (
      <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
        <Link to="/auth" className="font-bold text-foreground underline">
          Sign in
        </Link>{" "}
        to invite your team.
      </div>
    );
  }

  const invite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email");
    setBusy(true);
    try {
      // Make sure the project exists in the cloud before adding members.
      await syncNow();
      await inviteMember(project.id, email, role, session.user.id);
      setEmail("");
      toast.success("Invite added — they'll see this project after signing in with that email");
      load();
    } catch (e) {
      toast.error((e as Error).message.includes("duplicate") ? "Already invited" : "Couldn't invite — try again when online");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Team / Members</p>
      </div>

      {offline && <p className="text-sm text-muted-foreground">Team changes need a connection.</p>}

      <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
        <span className="flex-1 truncate text-sm font-semibold">
          {project.owner_id === session.user.id ? "You" : "Project owner"}
        </span>
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Owner</span>
      </div>

      {members.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            {m.email}
            {!m.user_id && <span className="ml-2 text-xs font-medium text-muted-foreground">invited</span>}
          </span>
          {isAdmin ? (
            <>
              <select
                className="h-11 rounded-xl border border-input bg-card px-3 text-sm font-semibold"
                value={m.role}
                onChange={(e) =>
                  void updateMemberRole(m.id, e.target.value as ProjectRole).then(load, () => toast.error("Couldn't update"))
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {PROJECT_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <button
                aria-label={`Remove ${m.email}`}
                onClick={() => void removeMember(m.id).then(load, () => toast.error("Couldn't remove"))}
                className="grid size-11 place-items-center rounded-xl text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </>
          ) : (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{PROJECT_ROLE_LABEL[m.role]}</span>
          )}
        </div>
      ))}

      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void invite();
          }}
          className="space-y-2"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@email.com"
            className={inputCls}
            disabled={offline}
          />
          <div className="flex gap-1 rounded-2xl bg-secondary p-1">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={cn(
                  "h-11 flex-1 rounded-xl text-xs font-bold sm:text-sm",
                  role === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {PROJECT_ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <button
            disabled={busy || offline}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <UserPlus className="size-4" /> Invite
          </button>
        </form>
      )}
    </div>
  );
}
