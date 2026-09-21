import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Project, Take } from "./db";

const COLUMNS: { key: keyof Take; label: string }[] = [
  { key: "scene", label: "Scene" },
  { key: "shot", label: "Shot" },
  { key: "take", label: "Take" },
  { key: "camera_roll", label: "Cam Roll" },
  { key: "sound_roll", label: "Snd Roll" },
  { key: "lens", label: "Lens" },
  { key: "filter", label: "Filter" },
  { key: "character_name", label: "Character" },
  { key: "lut", label: "LUT" },
  { key: "aspect_ratio", label: "Aspect" },
  { key: "format", label: "Format" },
  { key: "resolution", label: "Res" },
  { key: "fps", label: "FPS" },
  { key: "shutter", label: "Shutter" },
  { key: "wb", label: "WB" },
  { key: "iso", label: "ISO" },
  { key: "aperture", label: "T-stop" },
  { key: "good_take", label: "Good" },
  { key: "notes", label: "Notes" },
];

function cell(t: Take, key: keyof Take) {
  const v = t[key];
  if (typeof v === "boolean") return v ? "YES" : "";
  return v == null ? "" : String(v);
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(project: Project, takes: Take[]) {
  const head = COLUMNS.map((c) => c.label).join(",");
  const rows = takes.map((t) =>
    COLUMNS.map((c) => `"${cell(t, c.key).replace(/"/g, '""')}"`).join(","),
  );
  const csv = [head, ...rows].join("\n");
  download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${slug(project.title)}-logs.csv`);
}

export function exportPdf(project: Project, takes: Take[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(18);
  doc.text(project.title || "Untitled project", 40, 44);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `${project.production_name || "—"}  ·  ${project.media_type.toUpperCase()}  ·  ${takes.length} takes  ·  ${new Date().toLocaleString()}`,
    40,
    62,
  );
  autoTable(doc, {
    startY: 80,
    head: [COLUMNS.map((c) => c.label)],
    body: takes.map((t) => COLUMNS.map((c) => cell(t, c.key))),
    styles: { fontSize: 7, cellPadding: 4, textColor: 40 },
    headStyles: { fillColor: [255, 56, 92], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 30, right: 30 },
  });
  doc.save(`${slug(project.title)}-report.pdf`);
}

function slug(s: string) {
  return (s || "asmolog").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
