import { supabase } from "@/integrations/supabase/client";
import { db, type Project, type Take } from "./db";

export type SyncStatus = "offline" | "online" | "syncing";

function toRemoteProject(p: Project, ownerId: string) {
  return {
    id: p.id,
    owner_id: ownerId,
    title: p.title,
    production_name: p.production_name,
    media_type: p.media_type,
    lenses: p.lenses,
    filters: p.filters,
    characters: p.characters,
    luts: p.luts,
    aspect_ratios: p.aspect_ratios,
    formats: p.formats,
    resolutions: p.resolutions,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

function toRemoteTake(t: Take, ownerId: string) {
  const { sync: _sync, owner_id: _owner, ...rest } = t;
  return { ...rest, owner_id: ownerId };
}

export async function pendingCount() {
  const [p, t] = await Promise.all([
    db.projects.where("sync").equals("pending").count(),
    db.takes.where("sync").equals("pending").count(),
  ]);
  return p + t;
}

/** Pushes local pending records to the cloud, then pulls remote records down. */
export async function syncNow(): Promise<{ pushed: number; pulled: number }> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return { pushed: 0, pulled: 0 };

  let pushed = 0;

  const projects = await db.projects.where("sync").equals("pending").toArray();
  if (projects.length) {
    const { error } = await supabase
      .from("projects")
      .upsert(projects.map((p) => toRemoteProject(p, userId)));
    if (error) throw error;
    await db.projects.bulkPut(projects.map((p) => ({ ...p, owner_id: userId, sync: "synced" as const })));
    pushed += projects.length;
  }

  const takes = await db.takes.where("sync").equals("pending").toArray();
  if (takes.length) {
    const { error } = await supabase.from("takes").upsert(takes.map((t) => toRemoteTake(t, userId)));
    if (error) throw error;
    await db.takes.bulkPut(takes.map((t) => ({ ...t, owner_id: userId, sync: "synced" as const })));
    pushed += takes.length;
  }

  let pulled = 0;
  const { data: remoteProjects } = await supabase.from("projects").select("*");
  if (remoteProjects) {
    for (const rp of remoteProjects) {
      const local = await db.projects.get(rp.id);
      if (!local || (local.sync === "synced" && rp.updated_at > local.updated_at)) {
        await db.projects.put({
          ...(rp as unknown as Project),
          lenses: (rp.lenses as string[]) ?? [],
          filters: (rp.filters as string[]) ?? [],
          characters: (rp.characters as string[]) ?? [],
          luts: (rp.luts as string[]) ?? [],
          aspect_ratios: (rp.aspect_ratios as string[]) ?? [],
          formats: (rp.formats as string[]) ?? [],
          resolutions: (rp.resolutions as string[]) ?? [],
          sync: "synced",
        });
        pulled++;
      }
    }
  }

  const { data: remoteTakes } = await supabase.from("takes").select("*");
  if (remoteTakes) {
    for (const rt of remoteTakes) {
      const local = await db.takes.get(rt.id);
      if (!local || (local.sync === "synced" && rt.updated_at > local.updated_at)) {
        await db.takes.put({ ...(rt as unknown as Take), sync: "synced" });
        pulled++;
      }
    }
  }

  return { pushed, pulled };
}
