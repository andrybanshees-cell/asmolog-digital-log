import Dexie, { type Table } from "dexie";

export type MediaType = "digital" | "film" | "custom";
export type SyncState = "pending" | "synced";

export interface Project {
  id: string;
  owner_id: string | null;
  title: string;
  production_name: string;
  media_type: MediaType;
  location: string;
  shoot_date: string;
  production_company: string;
  director: string;
  dp: string;
  first_ac: string;
  second_ac: string;
  lenses: string[];
  filters: string[];
  characters: string[];
  luts: string[];
  aspect_ratios: string[];
  formats: string[];
  resolutions: string[];
  base_isos: string[];
  eis: string[];
  created_at: string;
  updated_at: string;
  sync: SyncState;
  deleted?: number;
}

export interface Take {
  id: string;
  project_id: string;
  owner_id: string | null;
  scene: string;
  shot: string;
  take: number;
  camera_roll: string;
  sound_roll: string;
  clip: string;
  slate: string;
  card: string;
  lens: string;
  filter: string;
  character_name: string;
  lut: string;
  aspect_ratio: string;
  format: string;
  resolution: string;
  fps: string;
  shutter: string;
  wb: string;
  iso: string;
  aperture: string;
  good_take: boolean;
  notes: string;
  logged_at: string;
  updated_at: string;
  sync: SyncState;
}

export interface Preset {
  id: string;
  owner_id: string | null;
  name: string;
  lenses: string[];
  filters: string[];
  characters: string[];
  luts: string[];
  aspect_ratios: string[];
  formats: string[];
  resolutions: string[];
  base_isos: string[];
  eis: string[];
  created_at: string;
  updated_at: string;
  sync: SyncState;
}

class AsmologDB extends Dexie {
  projects!: Table<Project, string>;
  takes!: Table<Take, string>;
  presets!: Table<Preset, string>;

  constructor() {
    super("asmolog");
    this.version(1).stores({
      projects: "id, updated_at, sync",
      takes: "id, project_id, scene, shot, good_take, camera_roll, logged_at, sync",
    });
    this.version(2).stores({
      projects: "id, updated_at, sync",
      takes: "id, project_id, scene, shot, good_take, camera_roll, logged_at, sync",
      presets: "id, name, updated_at, sync",
    });
    this.version(3)
      .stores({
        projects: "id, updated_at, sync",
        takes: "id, project_id, scene, shot, good_take, camera_roll, logged_at, sync",
        presets: "id, name, updated_at, sync",
      })
      .upgrade(async (tx) => {
        await tx.table("projects").toCollection().modify((p: Record<string, unknown>) => {
          for (const k of ["location", "shoot_date", "production_company", "director", "dp", "first_ac", "second_ac"])
            p[k] ??= "";
          p.base_isos ??= [];
          p.eis ??= [];
        });
        await tx.table("presets").toCollection().modify((p: Record<string, unknown>) => {
          p.base_isos ??= [];
          p.eis ??= [];
        });
        await tx.table("takes").toCollection().modify((t: Record<string, unknown>) => {
          t.clip ??= "";
          t.slate ??= "";
          t.card ??= "";
        });
      });
  }
}

export const db = new AsmologDB();

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const META_FIELDS = [
  { key: "lenses", label: "Lens Types", hint: "18mm, 35mm, 50mm" },
  { key: "filters", label: "Filters", hint: "ND 0.9, Pola, Clear" },
  { key: "characters", label: "Character Names", hint: "For continuity logging" },
  { key: "luts", label: "LUTs", hint: "Rec709_Base, FilmLook_V1" },
  { key: "aspect_ratios", label: "Aspect Ratios", hint: "16:9, 2.39:1, 4:3" },
  { key: "formats", label: "Formats", hint: "ProRes 4444, RAW, H.264" },
  { key: "resolutions", label: "Resolutions", hint: "4K DCI, 1080p, 8K" },
  { key: "base_isos", label: "Base ISO", hint: "800, 3200" },
  { key: "eis", label: "EI / Exposure Index", hint: "EI 800, EI 1600" },
] as const;

export type MetaKey = (typeof META_FIELDS)[number]["key"];

export const META_PRESETS: Record<MetaKey, string[]> = {
  lenses: ["18mm", "25mm", "35mm", "50mm", "85mm"],
  filters: ["Clear", "ND 0.3", "ND 0.6", "ND 0.9", "Pola"],
  characters: [],
  luts: ["Rec709_Base", "FilmLook_V1", "LogC_Neutral"],
  aspect_ratios: ["16:9", "2.39:1", "4:3", "1.85:1"],
  formats: ["ProRes 4444", "ProRes 422 HQ", "RAW", "H.264"],
  resolutions: ["4K DCI", "UHD 3840x2160", "1080p", "8K"],
  base_isos: ["400", "800", "1600", "3200"],
  eis: ["EI 400", "EI 800", "EI 1280", "EI 1600", "EI 3200"],
};

export const PROJECT_TEXT_DEFAULTS = {
  location: "",
  shoot_date: "",
  production_company: "",
  director: "",
  dp: "",
  first_ac: "",
  second_ac: "",
};

export function newProject(ownerId: string | null): Project {
  const now = new Date().toISOString();
  return {
    id: uid(),
    owner_id: ownerId,
    title: "",
    production_name: "",
    media_type: "digital",
    ...PROJECT_TEXT_DEFAULTS,
    lenses: [],
    filters: [],
    characters: [],
    luts: [],
    aspect_ratios: [],
    formats: [],
    resolutions: [],
    base_isos: [],
    eis: [],
    created_at: now,
    updated_at: now,
    sync: "pending",
  };
}
