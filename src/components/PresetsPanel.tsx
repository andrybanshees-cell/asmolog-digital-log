import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Download, Layers, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSheet } from "./TagSheet";
import { inputCls } from "./Shell";
import { db, uid, META_FIELDS, META_PRESETS, type MetaKey, type Preset, type Project } from "@/lib/db";
import { deletePreset } from "@/lib/sync";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

const KEYS = META_FIELDS.map((f) => f.key);
const total = (p: Pick<Preset, MetaKey>) => KEYS.reduce((n, k) => n + p[k].length, 0);

/** Every value known across built-in and saved global presets, per field. */
export function useGlobalValues(): Record<MetaKey, string[]> {
  const presets = useLiveQuery(() => db.presets.toArray(), []) ?? [];
  const out = {} as Record<MetaKey, string[]>;
  for (const k of KEYS) {
    out[k] = Array.from(new Set([...META_PRESETS[k], ...presets.flatMap((p) => p[k])]));
  }
  return out;
}

export function SavePresetButton({ project }: { project: Project }) {
  const { session, refreshPending, sync } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const save = async () => {
    const now = new Date().toISOString();
    const preset: Preset = {
      id: uid(),
      owner_id: session?.user.id ?? null,
      name: name.trim() || project.title || "Untitled preset",
      created_at: now,
      updated_at: now,
      sync: "pending",
      ...(Object.fromEntries(KEYS.map((k) => [k, [...project[k]]])) as Pick<Preset, MetaKey>),
    };
    await db.presets.put(preset);
    refreshPending();
    sync();
    setOpen(false);
    setName("");
    toast.success(`Saved preset “${preset.name}”`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-bold"
      >
        <Save className="size-4" /> Save as preset
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight">Save as preset</DialogTitle>
            <DialogDescription>
              Stores this project's lenses, filters, LUTs, characters, ratios, formats and resolutions
              as a reusable setup.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="space-y-3"
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arri Cine Prime Set"
              className={inputCls}
            />
            <button className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground">
              Save preset ({total(project)} items)
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LoadPresetButton({
  onLoad,
}: {
  onLoad: (values: Pick<Project, MetaKey>, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const presets = useLiveQuery(() => db.presets.orderBy("name").toArray(), []) ?? [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        <Download className="size-4" /> Load preset
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold tracking-tight">Load preset</DialogTitle>
            <DialogDescription>Merges the preset's items into this project.</DialogDescription>
          </DialogHeader>
          {presets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No presets yet. Use “Save as preset” on a project first.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              {presets.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onLoad(p, p.name);
                    setOpen(false);
                  }}
                  className={cn(
                    "row-tap flex w-full items-center gap-3 px-4 py-4 text-left",
                    i > 0 && "border-t border-border",
                  )}
                >
                  <Layers className="size-5 text-muted-foreground" />
                  <span className="flex-1 truncate text-base font-semibold">{p.name}</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                    {total(p)} items
                  </span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GlobalPresetsManager({ editable }: { editable: boolean }) {
  const { session, refreshPending, sync } = useApp();
  const presets = useLiveQuery(() => db.presets.orderBy("name").toArray(), []) ?? [];
  const globals = useGlobalValues();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ id: string; key: MetaKey } | null>(null);

  const update = async (p: Preset, patch: Partial<Preset>) => {
    await db.presets.put({ ...p, ...patch, updated_at: new Date().toISOString(), sync: "pending" });
    refreshPending();
    sync();
  };

  const create = async () => {
    const now = new Date().toISOString();
    const id = uid();
    await db.presets.put({
      id,
      owner_id: session?.user.id ?? null,
      name: "New preset",
      lenses: [],
      filters: [],
      characters: [],
      luts: [],
      aspect_ratios: [],
      formats: [],
      resolutions: [],
      created_at: now,
      updated_at: now,
      sync: "pending",
    });
    setOpenId(id);
    refreshPending();
    sync();
  };

  const sheetPreset = sheet ? presets.find((p) => p.id === sheet.id) : null;

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Global presets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable kit setups you can load into any project.
          </p>
        </div>
        {editable && (
          <button
            onClick={() => void create()}
            className="flex h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-bold"
          >
            <Plus className="size-4" /> New
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {presets.length === 0 && (
          <div className="surface p-6 text-center text-sm text-muted-foreground">
            No presets saved yet.
          </div>
        )}
        {presets.map((p) => (
          <div key={p.id} className="surface overflow-hidden">
            <button
              onClick={() => setOpenId(openId === p.id ? null : p.id)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="grid size-11 place-items-center rounded-full bg-secondary">
                <Layers className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{p.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {total(p)} items{p.sync === "pending" && " · pending sync"}
                </span>
              </span>
              <ChevronRight
                className={cn("size-5 text-muted-foreground transition-transform", openId === p.id && "rotate-90")}
              />
            </button>
            {openId === p.id && (
              <div className="space-y-4 border-t border-border p-4">
                <input
                  disabled={!editable}
                  className={inputCls}
                  value={p.name}
                  onChange={(e) => void update(p, { name: e.target.value })}
                />
                <div className="overflow-hidden rounded-2xl border border-border">
                  {META_FIELDS.map((f, i) => (
                    <button
                      key={f.key}
                      onClick={() => setSheet({ id: p.id, key: f.key })}
                      className={cn(
                        "row-tap flex w-full items-center gap-3 px-4 py-4 text-left",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="flex-1 text-base font-semibold">{f.label}</span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                        {p[f.key].length}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                {editable && (
                  <button
                    onClick={() => {
                      void deletePreset(p.id).then(() => {
                        refreshPending();
                        toast.success("Preset deleted");
                      });
                    }}
                    className="flex h-12 items-center gap-2 rounded-full border border-border px-5 text-sm font-bold text-destructive"
                  >
                    <Trash2 className="size-4" /> Delete preset
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {sheet && sheetPreset && (
        <TagSheet
          open
          onOpenChange={(v) => !v && setSheet(null)}
          title={META_FIELDS.find((f) => f.key === sheet.key)!.label}
          hint={META_FIELDS.find((f) => f.key === sheet.key)!.hint}
          values={sheetPreset[sheet.key]}
          presets={globals[sheet.key]}
          readOnly={!editable}
          onChange={(next) => void update(sheetPreset, { [sheet.key]: next })}
        />
      )}
    </section>
  );
}
