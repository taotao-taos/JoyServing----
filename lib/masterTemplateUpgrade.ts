/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentMarketInfo, HiredAgent } from '../src/types';

export interface PendingTemplateUpgrade {
  version: string;
  releaseNotes: string;
  marketName: string;
}

export function getPendingTemplateUpgrade(
  agent: HiredAgent,
  market?: AgentMarketInfo,
): PendingTemplateUpgrade | null {
  if (!market?.templateVersion) return null;
  if (agent.templateUpgradeDismissedVersion === market.templateVersion) return null;
  if (agent.syncedTemplateVersion === market.templateVersion) return null;

  return {
    version: market.templateVersion,
    releaseNotes:
      market.templateReleaseNotes?.trim() ||
      '母版流程与工具调用能力已优化，建议同步至当前数字员工。',
    marketName: market.name,
  };
}

/** 将发版说明拆为条目列表 */
export function parseReleaseNoteItems(notes: string): string[] {
  return notes
    .split('\n')
    .map((line) => line.replace(/^\d+[.)、]\s*/, '').trim())
    .filter(Boolean);
}

export function hasEmployeeTrainNotice(agent: HiredAgent, market?: AgentMarketInfo): boolean {
  return getPendingTemplateUpgrade(agent, market) !== null;
}
