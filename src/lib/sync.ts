import { supabase } from "@/integrations/supabase/client";
import { db, type Preset, type Project, type Take } from "./db";

export type SyncStatus = "offline" | "online" | "syncing";

const CHUNK = 500;
const chunks = <T,>(arr: T[]) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
};
const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

function toRemoteProject(p: Project, ownerId: string) {
  const { sync: _s, deleted: _d, ...rest } = p;
  return { ...rest, owner_id: ownerId };
}
function toRemoteTake(t: Take, ownerId: string) {
  const { sync: _s, ...rest } = t;
  return { ...rest, owner_id: ownerId };
}
function toRemotePreset(p: Preset, ownerId: string) {
  const { sync: _s, ...rest } = p;
  return { ...rest, owner_id: ownerId };
}

export async function pendingCount() {
  const [p, t, s] = await Promise.all([
    db.projects.where("sync").equals("pending").count(),
    db.takes.where("sync").equals("pending").count(),
    db.presets.where("sync").equals("pending").count(),
  ]);
  return p + t + s;
}

/** Merge remote rows into a local table with one bulkGet + one bulkPut. */
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

/** Batched push of pending records, then batched pull. Projects first (takes FK). */
export async function syncNow(): Promise<{ pushed: number; pulled: number }> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { pushed: 0, pulled: 0 };

  let pushed = 0;
  const [projects, presets, takes] = await Promise.all([
    db.projects.where("sync").equals("pending").toArray(),
    db.presets.where("sync").equals("pending").toArray(),
    db.takes.where("sync").equals("pending").toArray(),
  ]);

  for (const c of chunks(projects)) {
    const { error } = await supabase.from("projects").upsert(c.map((p) => toRemoteProject(p, userId)));
    if (error) throw error;
    await db.projects.bulkPut(c.map((p) => ({ ...p, owner_id: userId, sync: "synced" as const })));
    pushed += c.length;
  }
  for (const c of chunks(presets)) {
    const { error } = await supabase
      .from("metadata_presets")
      .upsert(c.map((p) => toRemotePreset(p, userId)));
    if (error) throw error;
    await db.presets.bulkPut(c.map((p) => ({ ...p, owner_id: userId, sync: "synced" as const })));
    pushed += c.length;
  }
  for (const c of chunks(takes)) {
    const { error } = await supabase.from("takes").upsert(c.map((t) => toRemoteTake(t, userId)));
    if (error) throw error;
    await db.takes.bulkPut(c.map((t) => ({ ...t, owner_id: userId, sync: "synced" as const })));
    pushed += c.length;
  }

  const [rp, rs, rt] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("metadata_presets").select("*"),
    supabase.from("takes").select("*"),
  ]);

  let pulled = 0;
  pulled += await mergeDown(
    db.projects,
    (rp.data ?? []).map((r) => ({
      ...(r as unknown as Project),
      lenses: arr(r.lenses),
      filters: arr(r.filters),
      characters: arr(r.characters),
      luts: arr(r.luts),
      aspect_ratios: arr(r.aspect_ratios),
      formats: arr(r.formats),
      resolutions: arr(r.resolutions),
      sync: "synced" as const,
    })),
  );
  pulled += await mergeDown(
    db.presets,
    (rs.data ?? []).map((r) => ({
      ...(r as unknown as Preset),
      lenses: arr(r.lenses),
      filters: arr(r.filters),
      characters: arr(r.characters),
      luts: arr(r.luts),
      aspect_ratios: arr(r.aspect_ratios),
      formats: arr(r.formats),
      resolutions: arr(r.resolutions),
      sync: "synced" as const,
    })),
  );
  pulled += await mergeDown(
    db.takes,
    (rt.data ?? []).map((r) => ({ ...(r as unknown as Take), sync: "synced" as const })),
  );

  return { pushed, pulled };
}

/** Delete a preset locally and remotely (best effort when online). */
export async function deletePreset(id: string) {
  await db.presets.delete(id);
  if (navigator.onLine) await supabase.from("metadata_presets").delete().eq("id", id);
}
