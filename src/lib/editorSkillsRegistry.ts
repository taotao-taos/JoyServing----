import type { EditorSkill } from "@/src/config/editorSkills";
import type { SkillWorkflow } from "@/src/config/editorSkillWorkflow";

type ManifestSkill = {
  id: string;
  title: string;
  description?: string;
  doc?: string;
  workflow?: SkillWorkflow;
};

type ManifestFile = {
  skills?: ManifestSkill[];
};

/**
 * 仅来自 public/editor-skills/manifest.json，不做内置虚拟技能合并。
 * 技能 = 挂载的说明文档（可选拉取 md），与对话/生图用哪个上游模型无关。
 */
let merged: EditorSkill[] = [];
let loadPromise: Promise<EditorSkill[]> | null = null;

function skillsFromManifest(extra: ManifestSkill[]): EditorSkill[] {
  const out: EditorSkill[] = [];
  for (const s of extra) {
    if (!s?.id || !s.title) continue;
    out.push({
      id: s.id,
      title: s.title,
      description: (s.description ?? "").trim(),
      ...(s.workflow && typeof s.workflow === "object"
        ? { workflow: s.workflow }
        : {}),
    });
  }
  return out;
}

function editorSkillsDocUrl(path: string): string {
  const raw = path.startsWith("/") ? path.slice(1) : path;
  const segs = raw.split("/").filter(Boolean).map(encodeURIComponent);
  return `/editor-skills/${segs.join("/")}`;
}

async function fetchDoc(path: string): Promise<string> {
  const url = path.startsWith("/") ? path : editorSkillsDocUrl(path);
  const r = await fetch(url);
  if (!r.ok) return "";
  return (await r.text()).trim();
}

/**
 * 从 `public/editor-skills/manifest.json` 加载技能；可选项 `doc` 为同目录下 md/txt 文件名。
 */
export async function ensureEditorSkillsLoaded(): Promise<EditorSkill[]> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const r = await fetch("/editor-skills/manifest.json", { cache: "no-store" });
      if (!r.ok) {
        merged = [];
        return merged;
      }
      const j = (await r.json()) as ManifestFile;
      const extra = Array.isArray(j.skills) ? j.skills : [];
      let base = skillsFromManifest(extra);
      const withDocs = await Promise.all(
        base.map(async (sk) => {
          const m = extra.find((e) => e.id === sk.id);
          if (!m?.doc) return sk;
          const docBody = await fetchDoc(m.doc);
          if (!docBody) return sk;
          const cap = docBody.slice(0, 12_000);
          const description = [sk.description, cap].filter(Boolean).join("\n\n");
          return { ...sk, description };
        })
      );
      merged = withDocs;
      return merged;
    } catch {
      merged = [];
      return merged;
    }
  })();
  return loadPromise;
}

export function getEditorSkillsList(): EditorSkill[] {
  return merged;
}

export function getEditorSkillById(id: string | null): EditorSkill | null {
  if (!id) return null;
  return merged.find((s) => s.id === id) ?? null;
}
