import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "./app-context";
import type { Project } from "./db";

export type ProjectRole = "admin" | "editor" | "viewer";
export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  admin: "Admin",
  editor: "Contributor / Editor",
  viewer: "Viewer",
};

const CACHE = "asmolog.memberships";
const readCache = (): Record<string, ProjectRole> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE) ?? "{}");
  } catch {
    return {};
  }
};

/** Your role on one project. Owners and local-only projects are Admin. Cached for offline use. */
export function useProjectRole(project: Project | null | undefined): ProjectRole {
  const { session, role } = useApp();
  const me = session?.user.id;
  const owner = !project || !project.owner_id || project.owner_id === me;
  const [r, setR] = useState<ProjectRole>(() => (project ? readCache()[project.id] ?? "viewer" : "viewer"));

  useEffect(() => {
    if (!project || owner || !session) return;
    setR(readCache()[project.id] ?? "viewer");
    void supabase.rpc("project_role_for", { _project: project.id }).then(({ data }) => {
      if (!data) return;
      const next = data as ProjectRole;
      setR(next);
      localStorage.setItem(CACHE, JSON.stringify({ ...readCache(), [project.id]: next }));
    });
  }, [project?.id, owner, session]);

  if (role === "viewer" && owner) return "viewer";
  return owner ? "admin" : r;
}

export const canLog = (r: ProjectRole) => r === "admin" || r === "editor";

export interface Member {
  id: string;
  email: string;
  role: ProjectRole;
  user_id: string | null;
}

export async function listMembers(projectId: string) {
  const { data, error } = await supabase
    .from("project_members")
    .select("id, email, role, user_id")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function inviteMember(projectId: string, email: string, role: ProjectRole, by: string) {
  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, email: email.trim().toLowerCase(), role, invited_by: by });
  if (error) throw error;
}

export async function updateMemberRole(id: string, role: ProjectRole) {
  const { error } = await supabase.from("project_members").update({ role }).eq("id", id);
  if (error) throw error;
}

export async function removeMember(id: string) {
  const { error } = await supabase.from("project_members").delete().eq("id", id);
  if (error) throw error;
}
