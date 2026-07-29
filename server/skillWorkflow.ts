/**
 * 从磁盘读取 public/editor-skills/manifest.json 中的 workflow（服务端信源）
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SkillWorkflow } from "../src/config/editorSkillWorkflow";

type ManifestRow = {
  id?: string;
  workflow?: SkillWorkflow;
};

type ManifestFile = {
  skills?: ManifestRow[];
};

const manifestPath = () =>
  join(process.cwd(), "public/editor-skills/manifest.json");

let cached: Map<string, SkillWorkflow> | null = null;

function loadMap(): Map<string, SkillWorkflow> {
  const map = new Map<string, SkillWorkflow>();
  const p = manifestPath();
  if (!existsSync(p)) return map;
  try {
    const raw = readFileSync(p, "utf8");
    const j = JSON.parse(raw) as ManifestFile;
    for (const row of j.skills ?? []) {
      const id = typeof row?.id === "string" ? row.id.trim() : "";
      if (!id || !row.workflow || typeof row.workflow !== "object") continue;
      map.set(id, row.workflow);
    }
  } catch {
    /* keep empty */
  }
  return map;
}

export function getSkillWorkflowById(
  skillId: string | null | undefined
): SkillWorkflow | null {
  if (!skillId || !String(skillId).trim()) return null;
  if (!cached) cached = loadMap();
  return cached.get(String(skillId).trim()) ?? null;
}
