/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  AgentConfigFields,
  AgentConfigSnapshot,
  HiredAgent,
  KnowledgeBase,
  Skill,
} from '../types';

export type AgentVersionStatus = 'draft' | 'running' | 'expired';
export type AgentVersionAction = 'view' | 'apply' | 'delete' | 'discard';

export const VERSION_STATUS_META: Record<
  AgentVersionStatus,
  { label: string; badge: string; dot: string }
> = {
  draft: { label: '培训中', badge: 'bg-sky-50 text-sky-600', dot: 'bg-sky-500' },
  running: { label: '接待中', badge: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' },
  expired: { label: '已过期', badge: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-400' },
};

export interface AgentConfigVersionItem {
  id: string;
  snapshotId?: string;
  code: string;
  title: string;
  tag?: string;
  time: string;
  status: AgentVersionStatus;
  actions: AgentVersionAction[];
  isPreviewing?: boolean;
  isPublished?: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function formatVersionTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed} 10:00:00`;
  return trimmed;
}

function versionNumeric(agent: HiredAgent) {
  return agent.agentId.replace(/\D/g, '') || agent.id.replace(/\D/g, '').slice(-4) || '001';
}

export function versionCode(prefix: 'DRAFT' | 'V', agent: HiredAgent, revision: string) {
  return `${prefix}_${versionNumeric(agent)}${revision}`;
}

export function captureAgentConfig(agent: HiredAgent): AgentConfigFields {
  return {
    name: agent.name,
    avatar: agent.avatar,
    description: agent.description,
    skills: [...agent.skills],
    knowledgeBases: [...agent.knowledgeBases],
    persona: agent.persona,
    languageStyle: agent.languageStyle,
    constraints: agent.constraints,
    openingLine: agent.openingLine,
    backgroundKnowledge: agent.backgroundKnowledge,
    workflowNotes: agent.workflowNotes,
    responseTimeoutSeconds: agent.responseTimeoutSeconds,
    fallbackScript: agent.fallbackScript,
    transferTarget: agent.transferTarget,
    transferExternalUrl: agent.transferExternalUrl,
  };
}

export function snapshotToAgentUpdates(snapshot: AgentConfigSnapshot): Partial<HiredAgent> {
  return { ...snapshot.config };
}

export function mergeAgentWithSnapshot(agent: HiredAgent, snapshot: AgentConfigSnapshot): HiredAgent {
  return { ...agent, ...snapshot.config };
}

export function createBaselineSnapshot(agent: HiredAgent): AgentConfigSnapshot {
  return {
    id: `snap_baseline_${agent.id}`,
    code: versionCode('V', agent, '00'),
    title: '初始雇佣版本',
    savedAt: formatVersionTimestamp(agent.hiredAt),
    kind: 'baseline',
    config: captureAgentConfig(agent),
  };
}

export function ensureAgentSnapshots(agent: HiredAgent): AgentConfigSnapshot[] {
  const existing = agent.configSnapshots ?? [];
  if (existing.some((s) => s.kind === 'baseline')) return existing;
  return [createBaselineSnapshot(agent), ...existing];
}

export function savedSnapshotTitle(agent: HiredAgent, skills: Skill[]): string {
  const kbCount = agent.knowledgeBases.length;
  const skillCount = agent.skills.length;
  if (kbCount > 0 && skillCount > 0) return '员工知识与技能配备后';
  if (kbCount > 0) return '员工知识配备后';
  if (skillCount > 0) {
    const first = skills.find((s) => agent.skills.includes(s.id));
    return first ? `员工技能「${first.name}」配备后` : '员工技能配备后';
  }
  if (agent.persona || agent.openingLine) return '入职标签配置后';
  return '配置已保存';
}

export function createSavedSnapshot(
  agent: HiredAgent,
  snapshots: AgentConfigSnapshot[],
  title: string,
): AgentConfigSnapshot {
  const revision = pad2(snapshots.filter((s) => s.kind === 'saved').length + 1);
  return {
    id: `snap_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    code: versionCode('V', agent, revision),
    title,
    savedAt: formatVersionTimestamp(new Date()),
    kind: 'saved',
    config: captureAgentConfig(agent),
  };
}

export function getPublishedSnapshot(
  agent: HiredAgent,
  snapshots: AgentConfigSnapshot[],
): AgentConfigSnapshot | undefined {
  if (agent.publishedSnapshotId) {
    return snapshots.find((s) => s.id === agent.publishedSnapshotId);
  }
  const saved = snapshots.filter((s) => s.kind === 'saved');
  return saved[saved.length - 1];
}

export function buildAgentConfigVersions(
  agent: HiredAgent,
  knowledgeBases: KnowledgeBase[],
  skills: Skill[],
  opts: {
    isDirty?: boolean;
    lastSavedAt?: Date | null;
    previewSnapshotId?: string | null;
  } = {},
): AgentConfigVersionItem[] {
  const { isDirty = false, lastSavedAt = null, previewSnapshotId = null } = opts;
  const snapshots = ensureAgentSnapshots(agent);
  const published = getPublishedSnapshot(agent, snapshots);
  const savedSnapshots = snapshots
    .filter((s) => s.kind === 'saved')
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  const items: AgentConfigVersionItem[] = [
    {
      id: 'draft',
      code: versionCode('DRAFT', agent, ''),
      title: '当前编辑中',
      tag: isDirty ? '未发布' : undefined,
      time: lastSavedAt
        ? formatVersionTimestamp(lastSavedAt)
        : formatVersionTimestamp(agent.hiredAt),
      status: 'draft',
      actions: isDirty ? ['discard'] : [],
      isPreviewing: false,
    },
  ];

  savedSnapshots.forEach((snap) => {
    const isPublished = published?.id === snap.id;
    items.push({
      id: snap.id,
      snapshotId: snap.id,
      code: snap.code,
      title: snap.title,
      tag: isPublished ? '当前运行' : '已保存',
      time: snap.savedAt,
      status: isPublished ? 'running' : 'expired',
      actions: isPublished ? ['view'] : ['view', 'apply', 'delete'],
      isPreviewing: previewSnapshotId === snap.id,
      isPublished,
    });
  });

  const baseline = snapshots.find((s) => s.kind === 'baseline');
  if (baseline && !savedSnapshots.some((s) => s.id === baseline.id)) {
    const isPublished = published?.id === baseline.id;
    items.push({
      id: baseline.id,
      snapshotId: baseline.id,
      code: baseline.code,
      title: baseline.title,
      tag: '基线',
      time: baseline.savedAt,
      status: isPublished ? 'running' : 'expired',
      actions: isPublished ? ['view'] : ['view', 'apply'],
      isPreviewing: previewSnapshotId === baseline.id,
      isPublished,
    });
  }

  return items;
}
