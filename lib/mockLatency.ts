/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mock 网络延迟配置 — 对齐真实上线观感（仅未就绪区块出点阵）。
 */

export const MOCK_LATENCY = {
  /** 列表页首屏 / 切页拉数（员工、市场、知识库、技能、组织等） */
  pageList: { min: 340, max: 620 },
  /** 进入全屏工作台、培训配置、质检台、客服预览 */
  workspaceOpen: { min: 480, max: 820 },
  /** 页内二级面板 / 分段切换拉局部数据 */
  panelSwitch: { min: 200, max: 360 },
  /** 保存配置、提交表单 */
  save: { min: 420, max: 780 },
  /** 上传 / 解析类长任务（进度条期间） */
  upload: { min: 1200, max: 2200 },
  /** 对话 / 模型推理 */
  aiReply: { min: 2800, max: 4500 },
  /** 检索召回 */
  recall: { min: 180, max: 420 },
} as const;

export type MockLatencyProfile = keyof typeof MOCK_LATENCY;

export function pickMockLatencyMs(profile: MockLatencyProfile): number {
  const { min, max } = MOCK_LATENCY[profile];
  if (max <= 0) return 0;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function waitMockLatency(profile: MockLatencyProfile): Promise<number> {
  const ms = pickMockLatencyMs(profile);
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(ms), ms);
  });
}
