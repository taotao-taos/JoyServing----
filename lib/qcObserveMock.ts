/**
 * 质检工作台 · 观测指标 mock
 */

export type QcObserveWindow = '1h' | '24h' | '7d';

export type QcSystemMetricId =
  | 'first_token'
  | 'avg_latency'
  | 'timeout_sessions'
  | 'error_rate'
  | 'token_usage'
  | 'session_count'
  | 'user_count';

export type QcSystemMetricDef = {
  id: QcSystemMetricId;
  name: string;
  desc: string;
  unit: string;
};

export const QC_SYSTEM_METRICS: QcSystemMetricDef[] = [
  {
    id: 'first_token',
    name: '首token响应时间',
    desc: '第一个 token 响应耗时，反映系统响应速度',
    unit: 'ms',
  },
  {
    id: 'avg_latency',
    name: '平均响应时间',
    desc: '平均响应时间，衡量整体服务性能',
    unit: 'ms',
  },
  {
    id: 'timeout_sessions',
    name: '超时会话数',
    desc: '响应超时的会话数量',
    unit: '个',
  },
  {
    id: 'error_rate',
    name: '错误率',
    desc: 'API 调用失败率（百分比）',
    unit: '%',
  },
  {
    id: 'token_usage',
    name: 'Token消耗量',
    desc: 'Token 总消耗量（input + output）',
    unit: '',
  },
  {
    id: 'session_count',
    name: '会话总数',
    desc: 'Agent 会话总数（按 sessionId 去重）',
    unit: '个',
  },
  {
    id: 'user_count',
    name: '用户数',
    desc: '当前时间段内使用 Agent 的去重用户数量',
    unit: '个',
  },
];

export const DEFAULT_SYSTEM_METRIC_IDS: QcSystemMetricId[] = [
  'first_token',
  'avg_latency',
  'timeout_sessions',
  'error_rate',
  'session_count',
  'user_count',
];

export type QcBizMetricRow = {
  id: string;
  judge: string;
  metric: string;
  sampleRatio: string;
  sampleCap: string;
  statMethod: 'pass_rate' | 'hit_rate';
};

export const QC_STAT_METHOD_LABEL: Record<QcBizMetricRow['statMethod'], string> = {
  pass_rate: '通过率',
  hit_rate: '命中率',
};

export type QcRiskRule = {
  id: string;
  title: string;
  triggerType: 'redline' | 'deviation';
  operator: 'lte' | 'gte' | 'eq';
  threshold: string;
  deviationLabel?: string;
  capabilities: Array<'prompt' | 'knowledge'>;
};

export const QC_CAPABILITY_LABEL: Record<'prompt' | 'knowledge', string> = {
  prompt: 'Prompt进化',
  knowledge: '知识进化',
};

export type QcObserveConfig = {
  window: QcObserveWindow;
  systemMetricIds: QcSystemMetricId[];
  bizMetrics: QcBizMetricRow[];
  autoEvolve: boolean;
  prelabelAgent: string;
  riskRules: QcRiskRule[];
};

export function createDefaultObserveConfig(): QcObserveConfig {
  return {
    window: '24h',
    systemMetricIds: [...DEFAULT_SYSTEM_METRIC_IDS],
    bizMetrics: [
      {
        id: 'biz-1',
        judge: '12',
        metric: '12',
        sampleRatio: '1',
        sampleCap: '1',
        statMethod: 'pass_rate',
      },
      {
        id: 'biz-2',
        judge: '12',
        metric: '21',
        sampleRatio: '2',
        sampleCap: '1',
        statMethod: 'hit_rate',
      },
    ],
    autoEvolve: true,
    prelabelAgent: '对话编排agent_FidBubgb1785076854992',
    riskRules: [
      {
        id: 'risk-1',
        title: '12',
        triggerType: 'redline',
        operator: 'lte',
        threshold: '1',
        capabilities: ['prompt', 'knowledge'],
      },
      {
        id: 'risk-2',
        title: '21',
        triggerType: 'deviation',
        operator: 'lte',
        threshold: '1',
        deviationLabel: '偏离阈值',
        capabilities: ['prompt'],
      },
    ],
  };
}

export type QcObservePanelMetric = {
  id: QcSystemMetricId;
  name: string;
  value: number;
  unit: string;
};

export type QcObserveBizCard = {
  id: string;
  code: string;
  rate: string;
  deltaLabel: string;
  current: number;
  threshold: number;
};

export function buildObservePanelData(config: QcObserveConfig): {
  systemMetrics: QcObservePanelMetric[];
  bizCards: QcObserveBizCard[];
  insightOk: boolean;
  version: string;
} {
  const valueMap: Record<QcSystemMetricId, number> = {
    first_token: 0,
    avg_latency: 0,
    timeout_sessions: 0,
    error_rate: 0,
    token_usage: 0,
    session_count: 0,
    user_count: 0,
  };
  const systemMetrics = config.systemMetricIds
    .map((id) => {
      const def = QC_SYSTEM_METRICS.find((m) => m.id === id);
      if (!def) return null;
      return {
        id,
        name: def.name,
        value: valueMap[id],
        unit: def.unit,
      };
    })
    .filter(Boolean) as QcObservePanelMetric[];

  const bizCards: QcObserveBizCard[] = config.bizMetrics.map((row) => ({
    id: row.id,
    code: row.metric,
    rate: row.statMethod === 'pass_rate' ? '0.84%' : '0.75%',
    deltaLabel: '较前值',
    current: 35,
    threshold: 70,
  }));

  return {
    systemMetrics,
    bizCards,
    insightOk: true,
    version: 'V1.0.1',
  };
}

export function observeWindowLabel(w: QcObserveWindow): string {
  if (w === '1h') return '1小时';
  if (w === '7d') return '7天';
  return '24小时';
}
