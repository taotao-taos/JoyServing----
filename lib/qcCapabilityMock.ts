/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检能力测试 — 按用户配置标准对选定会话批次做确定性 mock 打分（不调 LLM）
 */

import type {
  ChatMessage,
  ChatSession,
  QcLlmDimension,
  QcOperatorType,
  QcStandardItem,
  QcStandardTree,
} from '@/src/types';
import { isQcStandardItemComplete, listQcStandardItems, QC_LLM_DIMENSIONS, QC_LLM_MODELS } from '@/lib/qcStandards';

/** 风险词表：从标准项名称/提示词中抽取后与会话正文匹配 */
const RISK_LEXICON = [
  '保本',
  '稳赚',
  '代客',
  '代您',
  '绝对',
  '保证收益',
  '有保障',
  '闭眼买',
  '肯定能',
  '保证赔',
  '一定赔',
  '肯定能赔',
  '不用健康告知',
  '随便报销',
  '辱骂',
  '三倍赔偿',
  '工商局',
  '退货',
  '翻新',
  '不知道',
  '随便',
  '推诿',
  '敷衍',
  '打断',
  '违规承诺',
] as const;

export type QcItemAuditResult = {
  itemId: string;
  itemName: string;
  categoryTitle: string;
  score: string;
  operatorType: QcOperatorType;
  selectedModel: string;
  modelLabel: string;
  llmDimension: QcLlmDimension | '';
  dimensionLabel: string;
  prompt: string;
  hit: boolean;
  evidence: string;
  complete: boolean;
};

export type QcAuditHit = {
  itemId: string;
  itemName: string;
  categoryTitle: string;
  score: string;
  evidence: string;
};

export type QcSessionAuditResult = {
  sessionId: string;
  title: string;
  customerName: string;
  agentId: string;
  score: number;
  passed: boolean;
  /** 仅命中项（兼容工作台） */
  hits: QcAuditHit[];
  /** 每一条质检标准的完整试跑结果 */
  itemResults: QcItemAuditResult[];
  /** 对话轮次（按客户发言近似） */
  dialogueRounds: number;
  /** 平均响应时长（秒，mock） */
  avgResponseSec: number;
};

export type QcScoreTag = {
  itemId: string;
  name: string;
  scoreLabel: string;
  scoreValue: number;
};

function parseScoreValue(raw: string): number {
  const n = Number(String(raw).replace(/^\+/, '').trim());
  return Number.isNaN(n) ? 0 : n;
}

function formatScoreLabel(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/** 单轮结果：继续保持 / 有待改进 */
export function splitQcResultTags(result: QcSessionAuditResult): {
  keep: QcScoreTag[];
  improve: QcScoreTag[];
} {
  const improve: QcScoreTag[] = [];
  const keepHit: QcScoreTag[] = [];
  const keepPass: QcScoreTag[] = [];

  for (const r of result.itemResults) {
    if (!r.complete) continue;
    const value = parseScoreValue(r.score || (r.hit ? '-10' : '0'));
    if (r.hit && value < 0) {
      improve.push({
        itemId: r.itemId,
        name: r.itemName,
        scoreLabel: formatScoreLabel(value || -10),
        scoreValue: value || -10,
      });
      continue;
    }
    if (r.hit && value > 0) {
      keepHit.push({
        itemId: r.itemId,
        name: r.itemName,
        scoreLabel: formatScoreLabel(value),
        scoreValue: value,
      });
      continue;
    }
    if (!r.hit) {
      const passValue = value > 0 ? value : 10;
      keepPass.push({
        itemId: r.itemId,
        name: r.itemName,
        scoreLabel: formatScoreLabel(passValue),
        scoreValue: passValue,
      });
    }
  }

  const keep = keepHit.length > 0 ? keepHit : keepPass.slice(0, 3);
  return { keep, improve };
}

export function buildQcPraiseLine(result: QcSessionAuditResult): string {
  const { keep, improve } = splitQcResultTags(result);
  if (keep[0]) return `${keep[0].name}，继续保持`;
  if (result.passed) return '整体表现不错，继续保持';
  if (improve[0]) return `${improve[0].name}仍需关注`;
  return '本次已完成质检，可查看报告';
}

export function buildQcEncourageLine(result: QcSessionAuditResult): string {
  if (result.score >= 90) return '非常出色~';
  if (result.passed) return '表现不错~';
  return '继续加油~';
}

export function buildQcSummaryText(result: QcSessionAuditResult): string {
  const { keep, improve } = splitQcResultTags(result);
  const parts: string[] = [
    `本次会话综合质检评分为${result.score}分。`,
  ];
  if (improve.length > 0) {
    parts.push(
      `命中待改进标签：${improve.map((t) => t.name).join('、')}。`,
    );
    parts.push(
      `建议关注：${improve
        .map((t) => `[${t.name}] 对照标准复盘话术与节奏`)
        .join('；')}。`,
    );
  } else {
    parts.push('未命中扣分项。');
  }
  if (keep.length > 0) {
    parts.push(`继续保持：${keep.map((t) => t.name).join('、')}。`);
  }
  return parts.join('');
}

function estimateDialogueRounds(messages: ChatMessage[]): number {
  const customerTurns = messages.filter((m) => m.sender === 'customer').length;
  if (customerTurns > 0) return customerTurns;
  return Math.max(1, Math.ceil(messages.length / 2));
}

function estimateAvgResponseSec(messages: ChatMessage[], score: number): number {
  const aiMsgs = messages.filter((m) => m.sender === 'ai' || m.sender === 'human');
  if (aiMsgs.length >= 2) {
    // 无可靠时间差时用稳定 mock
    return Math.max(20, 280 + (100 - score) * 2 - aiMsgs.length * 8);
  }
  return Math.max(20, 320 - Math.round(score * 1.2));
}

export type QcBatchAuditResult = {
  results: QcSessionAuditResult[];
  avgScore: number;
  hitSessionCount: number;
  totalSessions: number;
  passRate: number;
};

function modelLabelOf(value?: string): string {
  if (!value) return '未选模型';
  return QC_LLM_MODELS.find((m) => m.value === value)?.label ?? value;
}

function dimensionLabelOf(value?: QcLlmDimension | ''): string {
  if (!value) return '未选维度';
  return QC_LLM_DIMENSIONS.find((d) => d.value === value)?.label ?? value;
}

/** 从标准项抽取可用于 mock 命中的关键词 */
export function extractItemKeywords(item: QcStandardItem): string[] {
  const blob = `${item.name}\n${item.prompt ?? ''}`;
  const fromLexicon = RISK_LEXICON.filter((k) => blob.includes(k));
  if (fromLexicon.length > 0) return [...fromLexicon];
  const name = item.name.trim();
  if (name.length >= 2) return [name.slice(0, Math.min(6, name.length))];
  return [];
}

function messageText(messages: ChatMessage[]): string {
  return messages.map((m) => m.content).join('\n');
}

function findEvidence(joined: string, keyword: string): string {
  const idx = joined.indexOf(keyword);
  if (idx < 0) return keyword;
  const start = Math.max(0, idx - 12);
  const end = Math.min(joined.length, idx + keyword.length + 16);
  let snippet = joined.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < joined.length) snippet = `${snippet}…`;
  return snippet;
}

function evaluateItem(
  item: QcStandardItem,
  categoryTitle: string,
  joined: string,
): QcItemAuditResult {
  const complete = isQcStandardItemComplete(item);
  const keywords = complete ? extractItemKeywords(item) : [];
  const hitKw = keywords.find((k) => joined.includes(k));
  const hit = Boolean(hitKw);
  return {
    itemId: item.id,
    itemName: item.name || '未命名二级项',
    categoryTitle,
    score: item.score?.trim() || '',
    operatorType: item.operatorType,
    selectedModel: item.selectedModel || '',
    modelLabel: modelLabelOf(item.selectedModel),
    llmDimension: item.llmDimension || '',
    dimensionLabel: dimensionLabelOf(item.llmDimension),
    prompt: item.prompt?.trim() || '',
    hit,
    evidence: hitKw ? findEvidence(joined, hitKw) : '',
    complete,
  };
}

export function auditSessionAgainstStandard(
  session: ChatSession,
  tree: QcStandardTree,
  passScore: number,
): QcSessionAuditResult {
  const joined = messageText(session.messages);
  const listed = listQcStandardItems(tree);
  const itemResults = listed.map(({ item, categoryTitle }) =>
    evaluateItem(item, categoryTitle, joined),
  );
  const hits: QcAuditHit[] = itemResults
    .filter((r) => r.hit && r.complete)
    .map((r) => ({
      itemId: r.itemId,
      itemName: r.itemName,
      categoryTitle: r.categoryTitle,
      score: r.score || '-10',
      evidence: r.evidence,
    }));

  let deduct = 0;
  for (const h of hits) {
    const n = Number(h.score);
    if (!Number.isNaN(n)) {
      if (n < 0) deduct += Math.abs(n);
      else deduct -= n;
    } else {
      deduct += 10;
    }
  }

  const score = Math.max(0, Math.min(100, 100 - deduct));
  return {
    sessionId: session.id,
    title: session.scenario || session.id,
    customerName: session.customerName,
    agentId: session.assignedAgentId,
    score,
    passed: score >= passScore,
    hits,
    itemResults,
    dialogueRounds: estimateDialogueRounds(session.messages),
    avgResponseSec: estimateAvgResponseSec(session.messages, score),
  };
}

export function auditSessionBatch(
  sessions: ChatSession[],
  tree: QcStandardTree,
  passScore: number,
): QcBatchAuditResult {
  const results = sessions.map((s) => auditSessionAgainstStandard(s, tree, passScore));
  const totalSessions = results.length;
  const hitSessionCount = results.filter((r) => r.hits.length > 0).length;
  const avgScore =
    totalSessions === 0
      ? 0
      : Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalSessions);
  const passRate =
    totalSessions === 0
      ? 0
      : Math.round((results.filter((r) => r.passed).length / totalSessions) * 100);
  return { results, avgScore, hitSessionCount, totalSessions, passRate };
}

/** 将粘贴的客服对话文本转为可质检的临时会话 */
export function dialogueTextToSession(
  text: string,
  opts?: { agentId?: string; sessionId?: string },
): ChatSession {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const messages: ChatMessage[] = [];
  let i = 0;
  for (const line of lines) {
    const m = line.match(/^(客服|顾问|坐席|客户|用户|消费者)\s*[:：]\s*(.+)$/);
    if (m) {
      const role = m[1];
      const content = m[2];
      const isCustomer = /客户|用户|消费者/.test(role);
      messages.push({
        id: `qc_dlg_${++i}`,
        sender: isCustomer ? 'customer' : 'ai',
        name: isCustomer ? '客户' : '客服',
        content,
        timestamp: `12:00:${String(i).padStart(2, '0')}`,
      });
    } else {
      messages.push({
        id: `qc_dlg_${++i}`,
        sender: 'customer',
        name: '客户',
        content: line,
        timestamp: `12:00:${String(i).padStart(2, '0')}`,
      });
    }
  }
  if (messages.length === 0) {
    messages.push({
      id: 'qc_dlg_1',
      sender: 'customer',
      name: '客户',
      content: text.trim() || '（空）',
      timestamp: '12:00:01',
    });
  }
  return {
    id: opts?.sessionId ?? `qc_paste_${Date.now()}`,
    customerName: '能力测试客户',
    phoneOrEmail: '',
    scenario: '能力测试 · 粘贴会话',
    avatarSeed: 1,
    channel: 'web',
    status: 'completed',
    isTransferred: false,
    assignedAgentId: opts?.agentId ?? 'h_sales',
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    messages,
    thoughtTrace: [],
    todos: [],
  };
}

/** 能力测试专用样例（通用客服对话，任意质检标准均可试跑） */
export type QcSampleMeta = {
  /** 样例场景标题 */
  sceneTitle: string;
  /** 本样例用于验证的问题点 */
  testFocus: string;
};

export const QC_SAMPLE_META: Record<string, QcSampleMeta> = {
  qc_sample_over_promise: {
    sceneTitle: '过度承诺',
    testFocus: '测能否识别夸大保证、包办结果等违规承诺',
  },
  qc_sample_absolute: {
    sceneTitle: '绝对化表述',
    testFocus: '测能否识别「一定」「肯定」等绝对化用语',
  },
  qc_sample_attitude: {
    sceneTitle: '服务态度',
    testFocus: '测能否识别冷漠、推诿等不良服务态度',
  },
  qc_sample_compliant: {
    sceneTitle: '规范答复',
    testFocus: '测合规说明是否不被误判为违规',
  },
};

export function resolveQcSampleMeta(session: ChatSession): QcSampleMeta | null {
  if (QC_SAMPLE_META[session.id]) return QC_SAMPLE_META[session.id];
  if (!session.id.startsWith('qc_sample_')) return null;
  const raw = session.scenario.replace(/^【样例】/, '').trim();
  const [scene, focus] = raw.split('·').map((s) => s.trim());
  return {
    sceneTitle: scene || raw || '通用测试',
    testFocus: focus ? `测：${focus}` : '测标准命中与评分是否符合预期',
  };
}

export const QC_CAPABILITY_SAMPLE_SESSIONS: ChatSession[] = [
  {
    id: 'qc_sample_over_promise',
    customerName: '客户A',
    phoneOrEmail: '138****1001',
    scenario: '【样例】过度承诺',
    avatarSeed: 7,
    channel: 'web',
    status: 'completed',
    isTransferred: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-07-20 10:12',
    messages: [
      {
        id: 'qc_sop_1',
        sender: 'customer',
        name: '客户',
        content: '能不能保证今天一定帮我处理完？',
        timestamp: '10:12:01',
      },
      {
        id: 'qc_sop_2',
        sender: 'ai',
        name: '客服',
        content: '您放心，我保证今天肯定给您办妥，绝对没问题。',
        timestamp: '10:12:20',
      },
    ],
    thoughtTrace: [],
    todos: [],
  },
  {
    id: 'qc_sample_absolute',
    customerName: '客户B',
    phoneOrEmail: '139****2002',
    scenario: '【样例】绝对化表述',
    avatarSeed: 21,
    channel: 'chat',
    status: 'completed',
    isTransferred: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-07-20 11:05',
    messages: [
      {
        id: 'qc_sa_1',
        sender: 'customer',
        name: '客户',
        content: '退款大概多久能到账？',
        timestamp: '11:05:01',
      },
      {
        id: 'qc_sa_2',
        sender: 'ai',
        name: '客服',
        content: '一定三个工作日到账，肯定没问题，您不用催。',
        timestamp: '11:05:18',
      },
    ],
    thoughtTrace: [],
    todos: [],
  },
  {
    id: 'qc_sample_attitude',
    customerName: '客户C',
    phoneOrEmail: '136****2004',
    scenario: '【样例】服务态度',
    avatarSeed: 29,
    channel: 'web',
    status: 'completed',
    isTransferred: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-07-20 13:10',
    messages: [
      {
        id: 'qc_sat_1',
        sender: 'customer',
        name: '客户',
        content: '我等很久了，能快点吗？',
        timestamp: '13:10:01',
      },
      {
        id: 'qc_sat_2',
        sender: 'ai',
        name: '客服',
        content: '催也没用，排队人多，您自己等等吧。',
        timestamp: '13:10:15',
      },
    ],
    thoughtTrace: [],
    todos: [],
  },
  {
    id: 'qc_sample_compliant',
    customerName: '客户D',
    phoneOrEmail: '137****3003',
    scenario: '【样例】规范答复',
    avatarSeed: 33,
    channel: 'web',
    status: 'completed',
    isTransferred: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-07-20 14:20',
    messages: [
      {
        id: 'qc_sc_1',
        sender: 'customer',
        name: '客户',
        content: '这个政策能确保我的权益吗？',
        timestamp: '14:20:01',
      },
      {
        id: 'qc_sc_2',
        sender: 'ai',
        name: '客服',
        content: '具体以平台公示的规则为准。我先帮您核实订单情况，再说明可选方案。',
        timestamp: '14:20:22',
      },
    ],
    thoughtTrace: [],
    todos: [],
  },
];

/** 入职能力测试面板专用：仅返回通用质检样例 */
export function listQcCapabilitySamples(): ChatSession[] {
  return [...QC_CAPABILITY_SAMPLE_SESSIONS];
}

/** 工作台试跑池 = 通用样例 + 平台接待会话 */
export function listCapabilityTestSessions(sessions: ChatSession[]): ChatSession[] {
  const live = sessions.filter((s) => s.messages.length > 0 && !!s.assignedAgentId);
  const liveIds = new Set(live.map((s) => s.id));
  const samples = QC_CAPABILITY_SAMPLE_SESSIONS.filter((s) => !liveIds.has(s.id));
  return [...samples, ...live];
}
