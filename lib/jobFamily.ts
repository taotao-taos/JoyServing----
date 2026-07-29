/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 数字员工岗位族工具
 */

import type { HiredAgent, JobFamily, QcProfile, QcScoreGrade } from '@/src/types';
import {
  areAllQcStandardItemsComplete,
  createEmptyStandardTree,
  isQcStandardConfigured,
} from '@/lib/qcStandards';

export const JOB_FAMILY_LABELS: Record<JobFamily, string> = {
  customer_service: '客服',
  quality_inspection: '质检',
};

export function resolveJobFamily(
  agent: Pick<HiredAgent, 'jobFamily'> | { jobFamily?: JobFamily } | null | undefined,
): JobFamily {
  return agent?.jobFamily ?? 'customer_service';
}

export function isQcAgent(agent: Pick<HiredAgent, 'jobFamily'> | null | undefined): boolean {
  return resolveJobFamily(agent) === 'quality_inspection';
}

export function createDefaultScoreGrades(): QcScoreGrade[] {
  return [];
}

export function createDefaultQcProfile(): QcProfile {
  return {
    standardConfigured: false,
    standard: createEmptyStandardTree(),
    passScore: 80,
    templateName: '质检模板配置',
    baseScore: 100,
    scoreGrades: createDefaultScoreGrades(),
    scoringLogic: 'deduction',
    scoreMax: 100,
    scoreMin: 0,
    defaultSource: 'platform_cs_sessions',
    defaultTargetScope: 'all_online_cs',
    defaultTargetAgentIds: [],
    trainingTestPassed: false,
  };
}

/** 兼容旧雇佣数据（去掉权重/禁语模板字段，补齐标准树） */
export function normalizeQcProfile(profile?: QcProfile | null): QcProfile {
  const base = createDefaultQcProfile();
  if (!profile) return base;
  const standard = profile.standard?.categories
    ? profile.standard
    : createEmptyStandardTree();
  const grades = Array.isArray(profile.scoreGrades)
    ? profile.scoreGrades.map((g, i) => ({
        id: g.id || `grade_${i}`,
        min: typeof g.min === 'number' && Number.isFinite(g.min) ? g.min : undefined,
        max: typeof g.max === 'number' && Number.isFinite(g.max) ? g.max : undefined,
        label: g.label ?? '',
      }))
    : [];
  const next: QcProfile = {
    ...base,
    ...profile,
    standard,
    passScore: profile.passScore ?? base.passScore,
    templateName: profile.templateName?.trim() || base.templateName,
    baseScore: Number.isFinite(profile.baseScore as number)
      ? Number(profile.baseScore)
      : base.baseScore,
    scoreGrades: grades,
    scoringLogic: 'deduction',
    scoreMax: Number.isFinite(profile.scoreMax as number)
      ? Number(profile.scoreMax)
      : base.scoreMax,
    scoreMin: Number.isFinite(profile.scoreMin as number)
      ? Number(profile.scoreMin)
      : base.scoreMin,
  };
  next.standardConfigured = isQcStandardConfigured(next.standard);
  return next;
}

/** 完成培训闸门：全部标准字段配齐 + 能力测试通过 */
export function isQcTrainingComplete(profile?: QcProfile | null): boolean {
  if (!profile) return false;
  const p = normalizeQcProfile(profile);
  return (
    areAllQcStandardItemsComplete(p.standard) &&
    isQcStandardConfigured(p.standard) &&
    p.trainingTestPassed
  );
}
