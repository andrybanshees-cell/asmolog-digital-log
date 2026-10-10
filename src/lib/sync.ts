import { supabase } from "@/integrations/supabase/client";
import { db, META_FIELDS, PROJECT_TEXT_DEFAULTS, type Preset, type Project, type Take } from "./db";

export type SyncStatus = "offline" | "online" | "syncing";

const CHUNK = 500;
const chunks = <T,>(arr: T[]) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
};
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const metaArrays = (r: Record<string, unknown>) =>
  Object.fromEntries(META_FIELDS.map((f) => [f.key, arr(r[f.key])]));

export function normalizeProject(r: Record<string, unknown>): Project {
  return {
    ...PROJECT_TEXT_DEFAULTS,
    ...(r as unknown as Project),
    ...metaArrays(r),
    sync: "synced",
  } as Project;
}
export function normalizeTake(r: Record<string, unknown>): Take {
  const t = r as unknown as Take;
  return { ...t, clip: t.clip ?? "", slate: t.slate ?? "", card: t.card ?? "", sync: "synced" };
}

function toRemoteProject(p: Project, userId: string) {
  const { sync: _s, deleted: _d, ...rest } = p;
  return { ...rest, owner_id: p.owner_id ?? userId };
}
function toRemoteTake(t: Take, userId: string) {
  const { sync: _s, ...rest } = t;
  return { ...rest, owner_id: t.owner_id ?? userId };
}
function toRemotePreset(p: Preset, userId: string) {
  const { sync: _s, ...rest } = p;
  return { ...rest, owner_id: userId };
}

export async function pendingCount() {
  const [p, t, s] = await Promise.all([
    db.projects.where("sync").equals("pending").count(),
    db.takes.where("sync").equals("pending").count(),
    db.presets.where("sync").equals("pending").count(),
  ]);
  return p + t + s;
}

async function mergeDown<L extends { id: string; updated_at: string; sync: string }>(
  table: import("dexie").Table<L, string>,
  remote: L[],
) {
  if (!remote.length) return 0;
  const locals = await table.bulkGet(remote.map((r) => r.id));
  const writes = remote.filter((r, i) => {
    const l = locals[i];
    return !l || (l.sync === "synced" && r.updated_at > l.updated_at);
  });
  if (writes.length) await table.bulkPut(writes);
  return writes.length;
}

/** Push one table in batches; a rejected batch stays pending instead of blocking the rest. */
async function pushBatches<T extends { owner_id: string | null }>(
  rows: T[],
  table: "projects" | "takes" | "metadata_presets",
  toRemote: (r: T) => Record<string, unknown>,
  markSynced: (rows: T[]) => Promise<unknown>,
) {
  let n = 0;
  for (const c of chunks(rows)) {
    const { error } = await supabase.from(table).upsert(c.map(toRemote) as never);
    if (error) {
      console.warn(`sync ${table} batch rejected`, error.message);
      continue;
    }
    await markSynced(c);
    n += c.length;
  }
  return n;
}

/** Batched push of pending records, then batched pull. Projects first (takes reference them). */
export async function syncNow(): Promise<{ pushed: number; pulled: number }> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { pushed: 0, pulled: 0 };

  const [projects, presets, takes] = await Promise.all([
    db.projects.where("sync").equals("pending").toArray(),
    db.presets.where("sync").equals("pending").toArray(),
    db.takes.where("sync").equals("pending").toArray(),
  ]);

  let pushed = 0;
  pushed += await pushBatches(projects, "projects", (p) => toRemoteProject(p, userId), (c) =>
    db.projects.bulkPut(c.map((p) => ({ ...p, owner_id: p.owner_id ?? userId, sync: "synced" as const }))),
  );
  pushed += await pushBatches(presets, "metadata_presets", (p) => toRemotePreset(p, userId), (c) =>
    db.presets.bulkPut(c.map((p) => ({ ...p, owner_id: userId, sync: "synced" as const }))),
  );
  pushed += await pushBatches(takes, "takes", (t) => toRemoteTake(t, userId), (c) =>
    db.takes.bulkPut(c.map((t) => ({ ...t, owner_id: t.owner_id ?? userId, sync: "synced" as const }))),
  );

  const [rp, rs, rt] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("metadata_presets").select("*"),
    supabase.from("takes").select("*"),
  ]);

  let pulled = 0;
  pulled += await mergeDown(db.projects, (rp.data ?? []).map((r) => normalizeProject(r)));
  pulled += await mergeDown(
    db.presets,
    (rs.data ?? []).map((r) => ({ ...(r as unknown as Preset), ...metaArrays(r), sync: "synced" as const })),
  );
  pulled += await mergeDown(db.takes, (rt.data ?? []).map((r) => normalizeTake(r)));

  return { pushed, pulled };
}

export async function deletePreset(id: string) {
  await db.presets.delete(id);
  if (navigator.onLine) await supabase.from("metadata_presets").delete().eq("id", id);
}

/** Live-mirror remote take changes into Dexie so viewers see new takes instantly. */
export function subscribeTakes() {
  const ch = supabase
    .channel("takes-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "takes" }, async (payload) => {
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: string }).id;
        if (id) await db.takes.delete(id);
        return;
      }
      const row = normalizeTake(payload.new as Record<string, unknown>);
      const local = await db.takes.get(row.id);
      if (local?.sync === "pending") return;
      await db.takes.put(row);
    })
    .subscribe();
  return () => void supabase.removeChannel(ch);
}
