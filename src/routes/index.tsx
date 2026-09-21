import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ChevronRight, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Shell, Field, inputCls } from "@/components/Shell";
import { TagSheet } from "@/components/TagSheet";
import {
  db,
  newProject,
  META_FIELDS,
  META_PRESETS,
  type MetaKey,
  type MediaType,
  type Project,
} from "@/lib/db";
import { canEdit, useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "asmolog — Digital camera logging for film sets" },
      {
        name: "description",
        content:
          "Offline-first camera log sheets for DITs and camera crew: projects, master metadata, per-take logging, CSV and PDF reports.",
      },
      { property: "og:title", content: "asmolog — Digital camera logging for film sets" },
      {
        property: "og:description",
        content: "Offline-first camera reports for DITs and camera crew.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Projects,
});

const MEDIA: { value: MediaType; label: string }[] = [
  { value: "digital", label: "Digital" },
  { value: "film", label: "Film" },
  { value: "custom", label: "Custom" },
];

function Projects() {
  const { session, role, activeProjectId, setActiveProjectId, refreshPending, sync } = useApp();
  const editable = canEdit(role);
  const projects = useLiveQuery(() => db.projects.toArray(), []) ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<MetaKey | null>(null);

  const active = projects.find((p) => p.id === (editingId ?? activeProjectId)) ?? null;

  const save = async (patch: Partial<Project>, project: Project) => {
    await db.projects.put({
      ...project,
      ...patch,
      updated_at: new Date().toISOString(),
      sync: "pending",
    });
    refreshPending();
    sync();
  };

  const create = async () => {
    const p = newProject(session?.user.id ?? null);
    p.title = "Untitled project";
    await db.projects.put(p);
    setActiveProjectId(p.id);
    setEditingId(p.id);
    refreshPending();
    sync();
  };

  const remove = async (p: Project) => {
    await db.projects.delete(p.id);
    await db.takes.where("project_id").equals(p.id).delete();
    if (activeProjectId === p.id) setActiveProjectId(null);
    setEditingId(null);
    toast.success("Project deleted");
  };

  return (
    <Shell>
      {!session && (
        <div className="surface mb-5 flex flex-wrap items-center gap-3 p-4">
          <p className="text-sm font-medium text-muted-foreground">
            You are logging locally on this device only.
          </p>
          <Link
            to="/auth"
            className="ml-auto flex h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            Sign in to sync
          </Link>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up master metadata once, then log takes in seconds.
          </p>
        </div>
        {editable && (
          <button
            onClick={() => void create()}
            className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <Plus className="size-4" /> New
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {projects.length === 0 && (
          <div className="surface p-8 text-center">
            <p className="font-semibold">No projects yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project to start logging takes.
            </p>
          </div>
        )}
        {projects.map((p) => (
          <div key={p.id} className="surface overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => setActiveProjectId(p.id)}
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full border",
                  activeProjectId === p.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
                aria-label="Set active"
              >
                <Check className="size-4" />
              </button>
              <button
                onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-base font-bold">{p.title || "Untitled project"}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {p.production_name || "No production name"} · {p.media_type}
                  {p.sync === "pending" && " · pending sync"}
                </p>
              </button>
              <ChevronRight
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  editingId === p.id && "rotate-90",
                )}
              />
            </div>

            {editingId === p.id && (
              <div className="space-y-4 border-t border-border p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Project title">
                    <input
                      disabled={!editable}
                      className={inputCls}
                      value={p.title}
                      onChange={(e) => void save({ title: e.target.value }, p)}
                    />
                  </Field>
                  <Field label="Production name">
                    <input
                      disabled={!editable}
                      className={inputCls}
                      value={p.production_name}
                      onChange={(e) => void save({ production_name: e.target.value }, p)}
                    />
                  </Field>
                </div>

                <Field label="Media type">
                  <div className="flex gap-1 rounded-2xl bg-secondary p-1">
                    {MEDIA.map((m) => (
                      <button
                        key={m.value}
                        disabled={!editable}
                        onClick={() => void save({ media_type: m.value }, p)}
                        className={cn(
                          "h-12 flex-1 rounded-xl text-sm font-bold transition-colors",
                          p.media_type === m.value
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="overflow-hidden rounded-2xl border border-border">
                  {META_FIELDS.map((f, i) => (
                    <button
                      key={f.key}
                      onClick={() => setSheet(f.key)}
                      className={cn(
                        "row-tap flex w-full items-center gap-3 px-4 py-4 text-left",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="flex-1">
                        <span className="block text-base font-semibold">{f.label}</span>
                        <span className="block text-xs text-muted-foreground">{f.hint}</span>
                      </span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                        {p[f.key].length} {p[f.key].length === 1 ? "item" : "items"}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>

                {editable && (
                  <button
                    onClick={() => void remove(p)}
                    className="flex h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-bold text-destructive"
                  >
                    <Trash2 className="size-4" /> Delete project
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {sheet && active && (
        <TagSheet
          open
          onOpenChange={(v) => !v && setSheet(null)}
          title={META_FIELDS.find((f) => f.key === sheet)!.label}
          hint={META_FIELDS.find((f) => f.key === sheet)!.hint}
          values={active[sheet]}
          presets={META_PRESETS[sheet]}
          readOnly={!editable}
          onChange={(next) => void save({ [sheet]: next } as Partial<Project>, active)}
        />
      )}
    </Shell>
  );
}
