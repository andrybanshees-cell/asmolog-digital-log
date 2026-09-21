import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { FileDown, FileText, Search, Trash2 } from "lucide-react";
import { Shell, inputCls } from "@/components/Shell";
import { db, type Take } from "@/lib/db";
import { canEdit, useApp } from "@/lib/app-context";
import { exportCsv, exportPdf } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Logs history & export — asmolog" },
      {
        name: "description",
        content: "Browse recorded takes by scene and shot, filter them, and export CSV or PDF reports.",
      },
      { property: "og:title", content: "Logs history & export — asmolog" },
      { property: "og:description", content: "Search, filter and export your camera logs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const { activeProjectId, role } = useApp();
  const editable = canEdit(role);
  const project = useLiveQuery(
    () => (activeProjectId ? db.projects.get(activeProjectId) : undefined),
    [activeProjectId],
  );
  const takes =
    useLiveQuery(
      () => (activeProjectId ? db.takes.where("project_id").equals(activeProjectId).toArray() : []),
      [activeProjectId],
    ) ?? [];

  const [q, setQ] = useState("");
  const [goodOnly, setGoodOnly] = useState(false);
  const [roll, setRoll] = useState("");

  const rolls = useMemo(
    () => Array.from(new Set(takes.map((t) => t.camera_roll).filter(Boolean))),
    [takes],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return takes
      .filter((t) => (goodOnly ? t.good_take : true))
      .filter((t) => (roll ? t.camera_roll === roll : true))
      .filter((t) =>
        needle
          ? [t.scene, t.shot, t.character_name, t.notes, t.lens, t.camera_roll]
              .join(" ")
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort(
        (a, b) =>
          a.scene.localeCompare(b.scene, undefined, { numeric: true }) ||
          a.shot.localeCompare(b.shot, undefined, { numeric: true }) ||
          a.take - b.take,
      );
  }, [takes, q, goodOnly, roll]);

  const groups = useMemo(() => {
    const map = new Map<string, Take[]>();
    for (const t of filtered) {
      const key = `${t.scene || "—"} / ${t.shot || "—"}`;
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (!project) {
    return (
      <Shell>
        <div className="surface p-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">No active project</h1>
          <Link
            to="/"
            className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground"
          >
            Go to projects
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Logs history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {takes.length} takes · {project.title}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(project, filtered)}
            className="flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-bold"
          >
            <FileDown className="size-4" /> CSV
          </button>
          <button
            onClick={() => exportPdf(project, filtered)}
            className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            <FileText className="size-4" /> PDF
          </button>
        </div>
      </div>

      <div className="surface mt-5 grid gap-3 p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(inputCls, "pl-11")}
            placeholder="Search scene, shot, character, notes"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className={cn(inputCls, "appearance-none")}
          value={roll}
          onChange={(e) => setRoll(e.target.value)}
        >
          <option value="">All camera rolls</option>
          {rolls.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          onClick={() => setGoodOnly(!goodOnly)}
          className={cn(
            "h-14 rounded-2xl border text-sm font-bold",
            goodOnly ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
          )}
        >
          Good takes only
        </button>
      </div>

      <div className="mt-6 space-y-5">
        {groups.length === 0 && (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            No takes match these filters.
          </div>
        )}
        {groups.map(([key, items]) => (
          <section key={key}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <h2 className="text-base font-bold">Scene {key}</h2>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                {items.length} takes
              </span>
            </div>
            <div className="surface divide-y divide-border overflow-hidden">
              {items.map((t) => (
                <div key={t.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-extrabold">
                      {t.take}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {[t.lens, t.filter, t.aspect_ratio, t.format, t.resolution]
                          .filter(Boolean)
                          .join(" · ") || "No rig metadata"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          t.fps && `${t.fps} fps`,
                          t.shutter && `${t.shutter}°`,
                          t.wb && `${t.wb}K`,
                          t.iso && `ISO ${t.iso}`,
                          t.aperture && `T${t.aperture}`,
                          t.camera_roll && `Cam ${t.camera_roll}`,
                          t.sound_roll && `Snd ${t.sound_roll}`,
                          t.character_name,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {t.good_take && (
                      <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                        Good
                      </span>
                    )}
                    {t.sync === "pending" && (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
                        Pending
                      </span>
                    )}
                    {editable && (
                      <button
                        onClick={() => void db.takes.delete(t.id)}
                        aria-label="Delete take"
                        className="grid size-11 place-items-center rounded-full text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  {t.notes && <p className="mt-2 text-sm text-muted-foreground">{t.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}
