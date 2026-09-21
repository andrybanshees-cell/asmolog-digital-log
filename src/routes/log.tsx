import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell, Field, inputCls } from "@/components/Shell";
import { db, uid, type Take } from "@/lib/db";
import { canEdit, useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/log")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Daily log sheet — asmolog" },
      {
        name: "description",
        content: "Log every take on set: scene, shot, take, lens, filter, LUT, FPS, ISO and notes.",
      },
      { property: "og:title", content: "Daily log sheet — asmolog" },
      { property: "og:description", content: "Per-take camera logging built for on-set speed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LogSheet,
});

type Draft = Omit<Take, "id" | "sync" | "logged_at" | "updated_at" | "owner_id" | "project_id">;

const emptyDraft: Draft = {
  scene: "",
  shot: "",
  take: 1,
  camera_roll: "",
  sound_roll: "",
  lens: "",
  filter: "",
  character_name: "",
  lut: "",
  aspect_ratio: "",
  format: "",
  resolution: "",
  fps: "",
  shutter: "",
  wb: "",
  iso: "",
  aperture: "",
  good_take: false,
  notes: "",
};

function LogSheet() {
  const { activeProjectId, session, role, refreshPending, sync } = useApp();
  const editable = canEdit(role);
  const project = useLiveQuery(
    () => (activeProjectId ? db.projects.get(activeProjectId) : undefined),
    [activeProjectId],
  );
  const recent =
    useLiveQuery(
      async () =>
        activeProjectId
          ? (await db.takes.where("project_id").equals(activeProjectId).toArray())
              .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
              .slice(0, 5)
          : [],
      [activeProjectId],
    ) ?? [];

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // Carry over rig settings from the most recent take when switching projects.
  useEffect(() => {
    const last = recent[0];
    if (!last) return;
    setDraft((d) =>
      d.scene === "" && d.lens === ""
        ? {
            ...d,
            scene: last.scene,
            shot: last.shot,
            take: last.take + 1,
            camera_roll: last.camera_roll,
            sound_roll: last.sound_roll,
            lens: last.lens,
            filter: last.filter,
            lut: last.lut,
            aspect_ratio: last.aspect_ratio,
            format: last.format,
            resolution: last.resolution,
            fps: last.fps,
            shutter: last.shutter,
            wb: last.wb,
            iso: last.iso,
            aperture: last.aperture,
          }
        : d,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.length > 0, activeProjectId]);

  if (!activeProjectId || !project) {
    return (
      <Shell>
        <div className="surface p-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight">No active project</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick or create a project first — its metadata fills these dropdowns.
          </p>
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

  const saveTake = async () => {
    const now = new Date().toISOString();
    const take: Take = {
      ...draft,
      id: uid(),
      project_id: project.id,
      owner_id: session?.user.id ?? null,
      logged_at: now,
      updated_at: now,
      sync: "pending",
    };
    await db.takes.put(take);
    refreshPending();
    sync();
    toast.success(`Saved Sc ${take.scene || "—"} / ${take.shot || "—"} / Tk ${take.take}`);
    setDraft({ ...draft, take: draft.take + 1, good_take: false, notes: "" });
  };

  const selects: { label: string; key: keyof Draft; options: string[] }[] = [
    { label: "Lens", key: "lens", options: project.lenses },
    { label: "Filter", key: "filter", options: project.filters },
    { label: "Character", key: "character_name", options: project.characters },
    { label: "LUT", key: "lut", options: project.luts },
    { label: "Aspect ratio", key: "aspect_ratio", options: project.aspect_ratios },
    { label: "Format", key: "format", options: project.formats },
    { label: "Resolution", key: "resolution", options: project.resolutions },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Log sheet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.title} · {project.production_name || "No production name"}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-4 py-2 text-sm font-bold">
          {recent.length > 0 ? `Last: Tk ${recent[0]!.take}` : "First take"}
        </span>
      </div>

      <fieldset disabled={!editable} className="mt-5 space-y-4">
        <div className="surface space-y-4 p-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Scene">
              <input
                className={inputCls}
                value={draft.scene}
                onChange={(e) => set("scene", e.target.value)}
              />
            </Field>
            <Field label="Shot">
              <input
                className={inputCls}
                value={draft.shot}
                onChange={(e) => set("shot", e.target.value)}
              />
            </Field>
            <Field label="Take">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputCls}
                  value={draft.take}
                  onChange={(e) => set("take", Number(e.target.value) || 1)}
                />
                <button
                  type="button"
                  onClick={() => set("take", draft.take + 1)}
                  className="h-14 shrink-0 rounded-2xl bg-secondary px-4 text-lg font-bold"
                  aria-label="Increment take"
                >
                  +1
                </button>
              </div>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Camera roll ID">
              <input
                className={inputCls}
                value={draft.camera_roll}
                onChange={(e) => set("camera_roll", e.target.value)}
              />
            </Field>
            <Field label="Sound roll ID">
              <input
                className={inputCls}
                value={draft.sound_roll}
                onChange={(e) => set("sound_roll", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="surface grid gap-3 p-4 sm:grid-cols-2">
          {selects.map((s) => (
            <Field key={s.key} label={s.label}>
              <select
                className={cn(inputCls, "appearance-none")}
                value={String(draft[s.key] ?? "")}
                onChange={(e) => set(s.key, e.target.value as never)}
              >
                <option value="">—</option>
                {s.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {s.options.length === 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  Add values in project setup
                </span>
              )}
            </Field>
          ))}
        </div>

        <div className="surface grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          <Field label="FPS">
            <input className={inputCls} value={draft.fps} onChange={(e) => set("fps", e.target.value)} />
          </Field>
          <Field label="Shutter angle">
            <input
              className={inputCls}
              value={draft.shutter}
              onChange={(e) => set("shutter", e.target.value)}
            />
          </Field>
          <Field label="WB (Kelvin)">
            <input className={inputCls} value={draft.wb} onChange={(e) => set("wb", e.target.value)} />
          </Field>
          <Field label="ISO">
            <input className={inputCls} value={draft.iso} onChange={(e) => set("iso", e.target.value)} />
          </Field>
          <Field label="Aperture (T-stop)">
            <input
              className={inputCls}
              value={draft.aperture}
              onChange={(e) => set("aperture", e.target.value)}
            />
          </Field>
          <button
            type="button"
            onClick={() => set("good_take", !draft.good_take)}
            className={cn(
              "mt-6 flex h-14 items-center justify-between rounded-2xl border px-4 text-base font-bold",
              draft.good_take
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card",
            )}
          >
            Good take
            <span
              className={cn(
                "relative h-7 w-12 rounded-full transition-colors",
                draft.good_take ? "bg-primary-foreground/30" : "bg-secondary",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-5 rounded-full bg-card transition-all",
                  draft.good_take ? "left-6" : "left-1",
                )}
              />
            </span>
          </button>
        </div>

        <div className="surface p-4">
          <Field label="Notes">
            <textarea
              rows={4}
              className={cn(inputCls, "h-auto py-3")}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => void saveTake()}
          className="h-16 w-full rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground"
        >
          Save Take Log
        </button>
      </fieldset>

      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold">Recent takes</h2>
          <div className="mt-3 space-y-2">
            {recent.map((t) => (
              <div key={t.id} className="surface flex items-center gap-3 px-4 py-3">
                <span className="font-bold">
                  {t.scene || "—"} / {t.shot || "—"} / Tk{t.take}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {[t.lens, t.filter, t.fps && `${t.fps}fps`, t.iso && `ISO ${t.iso}`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {t.good_take && (
                  <span className="ml-auto rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
                    Good
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}
