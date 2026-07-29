/** 项目与画布的本地持久化 */

export type StoredProject = {
  id: string;
  title: string;
  updatedAt: number;
  /** 列表略缩图：首图 URL 或 data URL */
  image?: string;
  /** JSON：{ objects, zoom, offset } */
  canvasJson?: string;
  /** 编辑器内选中的技能 id（与 manifest 一致） */
  editorSkillId?: string | null;
  /** 是否开启深度思考 / 智能编排路径 */
  editorDeepThink?: boolean;
};

const LS_KEY = "lovart-projects-v1";

export function loadStoredProjects(): StoredProject[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as StoredProject[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function saveStoredProjects(rows: StoredProject[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    /* quota */
  }
}

export function formatProjectListDate(ts: number): string {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * 首页项目卡预览图：
 * 1) 先取项目封面 image
 * 2) 再从 canvasJson.objects 里提取图片对象的 src，去重后补齐
 */
export function getProjectPreviewImages(project: {
  image?: string;
  canvasJson?: string;
}): string[] {
  const out: string[] = [];
  const pushUnique = (v: unknown) => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (!s) return;
    if (!/^https?:\/\//i.test(s) && !/^data:image\//i.test(s)) return;
    if (!out.includes(s)) out.push(s);
  };

  pushUnique(project.image);
  if (typeof project.canvasJson !== "string" || !project.canvasJson.trim()) {
    return out.slice(0, 4);
  }

  try {
    const parsed = JSON.parse(project.canvasJson) as {
      objects?: Array<Record<string, unknown>>;
    };
    const objects = Array.isArray(parsed?.objects) ? parsed.objects : [];
    for (const obj of objects) {
      if (!obj || typeof obj !== "object") continue;
      pushUnique((obj as Record<string, unknown>).src);
      pushUnique((obj as Record<string, unknown>).url);
      if (out.length >= 4) break;
    }
  } catch {
    // ignore invalid canvas json
  }

  return out.slice(0, 4);
}
