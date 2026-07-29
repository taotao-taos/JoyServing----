/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** 数字员工岗位族 — 决定工作台与培训表单 */
export type JobFamily = 'customer_service' | 'quality_inspection';

/** 质检标准指标类型（对齐 QC 下钻） */
export type QcIndicatorType = '质检类' | '分类标签' | '多维度评分类';

export type QcOperatorType = '大模型质检' | '工作流质检';

export type QcLlmDimension = 'session' | 'message_single' | 'message_context';

/** 二级质检项（用户自配） */
export interface QcStandardItem {
  id: string;
  name: string;
  /** 命中该项的扣分/加分，如 "-10" */
  score: string;
  operatorType: QcOperatorType;
  selectedModel?: string;
  llmDimension?: QcLlmDimension;
  prompt?: string;
}

/** 分类标签 / 多维评分的字段映射行 */
export interface QcAnalysisMappingRow {
  id: string;
  /** 输出字段，如 INTENT_A / SERVICE_A */
  outputField: string;
  /** 展示名称，如 愤怒 / 服务态度 */
  displayName: string;
  /** 输出原因字段 */
  reasonField?: string;
  /** 满分（多维） */
  maxScore?: string;
  /** 输出分值字段（多维） */
  scoreField?: string;
}

/** 分类标签 / 多维度评分类的大模型分析配置 */
export interface QcAnalysisConfig {
  llmDimension: QcLlmDimension;
  selectedModel: string;
  prompt: string;
  /** 分类标签：分析映射 */
  labelMappings: QcAnalysisMappingRow[];
  /** 多维：总映射 */
  totalMapping?: QcAnalysisMappingRow;
  /** 多维：类映射 */
  classMappings: QcAnalysisMappingRow[];
  chartEnabled?: boolean;
  chartType?: 'radar' | 'bar' | 'pie';
}

/** 一级分类 */
export interface QcStandardCategory {
  id: string;
  title: string;
  indicatorType: QcIndicatorType;
  children: QcStandardItem[];
  /** 分类标签 / 多维度评分类专用分析配置 */
  analysisConfig?: QcAnalysisConfig;
}

/** 用户配置的整棵质检标准树 */
export interface QcStandardTree {
  categories: QcStandardCategory[];
}

/** 质检员培训配置（标准 = 自配指标树，非固定模板选型） */
export interface QcScoreGrade {
  id: string;
  min?: number;
  max?: number;
  label: string;
}

export interface QcProfile {
  /** 质检标准是否已配置（至少一项可用） */
  standardConfigured: boolean;
  /** 用户自配标准树 */
  standard: QcStandardTree;
  /** 及格线（能力测试 / 计划汇总用） */
  passScore: number;
  /** 质检模板名称 */
  templateName: string;
  /** 基础分（满分通常为 100） */
  baseScore: number;
  /** 分数等级（全局） */
  scoreGrades: QcScoreGrade[];
  /** 评分逻辑：目前仅扣分制 */
  scoringLogic: 'deduction';
  /** 扣分制最高分 */
  scoreMax: number;
  /** 扣分制最低分 */
  scoreMin: number;
  /** 默认会话来源 */
  defaultSource: 'platform_cs_sessions' | 'external';
  /** 默认可检对象 */
  defaultTargetScope: 'all_online_cs' | 'specified';
  defaultTargetAgentIds: string[];
  /** 能力测试是否通过 */
  trainingTestPassed: boolean;
  /** 最近一次样例测试得分 */
  lastTestScore?: number;
}

export interface AgentMarketInfo {
  id: string;
  name: string;
  avatar: string;
  description: string;
  category: 'ready' | 'custom'; // ready = 开箱即用, custom = 需定制
  capabilities: string[];
  /** 岗位族，缺省视为客服 */
  jobFamily?: JobFamily;
  /** 市场母版当前能力版本 */
  templateVersion?: string;
  /** 母版升级发版说明 */
  templateReleaseNotes?: string;
}

export interface HiredAgent {
  id: string;
  name: string;
  marketId: string;
  agentId: string; // Like AGENT_001
  avatar: string;
  /** 用户是否在入职考核页手动更换过头像（emoji 时区分默认 Relay 与自选 emoji） */
  avatarCustomized?: boolean;
  description: string;
  skills: string[]; // List of skill IDs
  knowledgeBases: string[]; // List of KB IDs
  status: 'online' | 'draft';
  hiredAt: string;
  /** 岗位族，缺省视为客服 */
  jobFamily?: JobFamily;
  /** 质检岗位培训与运行配置 */
  qcProfile?: QcProfile;
  // 回答配置（入职标签与开场白）
  persona?: string;        // 职责 & 服务场景
  languageStyle?: string;  // 语言风格
  constraints?: string;    // 约束 & 限制
  openingLine?: string;    // 机器人开场白
  backgroundKnowledge?: string; // 背景知识
  workflowNotes?: string;  // 技能 & 工作流说明
  /** 应答超时（秒），超时后返回兜底话术 */
  responseTimeoutSeconds?: number;
  /** 超时、报错无返回时的兜底回复 */
  fallbackScript?: string;
  /** 转人工目标：本工作台坐席 / 外部平台 URL */
  transferTarget?: 'workspace' | 'external';
  /** 转其他工作台时的人工接待 URL */
  transferExternalUrl?: string;
  /** 入职考核页配置培训存档 */
  configSnapshots?: AgentConfigSnapshot[];
  /** 当前线上运行的快照 id */
  publishedSnapshotId?: string;
  /** 已同步的市场母版能力版本 */
  syncedTemplateVersion?: string;
  /** 用户对某母版版本选择「暂不处理」后不再提示 */
  templateUpgradeDismissedVersion?: string;
}

/** 可快照的员工配置字段 */
export interface AgentConfigFields {
  name: string;
  avatar: string;
  description: string;
  skills: string[];
  knowledgeBases: string[];
  persona?: string;
  languageStyle?: string;
  constraints?: string;
  openingLine?: string;
  backgroundKnowledge?: string;
  workflowNotes?: string;
  responseTimeoutSeconds?: number;
  fallbackScript?: string;
  transferTarget?: 'workspace' | 'external';
  transferExternalUrl?: string;
}

export interface AgentConfigSnapshot {
  id: string;
  code: string;
  title: string;
  savedAt: string;
  kind: 'baseline' | 'saved';
  config: AgentConfigFields;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  firstChar: string;
  docCount: number;
  wordCount: number;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
  author: string;
  updatedAt: string;
  usedByAgents: string[]; // Hired agent names
  type: 'subscribed' | 'mine' | 'market';
  description: string;
}

export interface ABTest {
  id: string;
  name: string;
  agentAId: string;
  agentBId: string;
  ratioA: number; // e.g. 50
  ratioB: number; // e.g. 50
  status: 'running' | 'paused' | 'completed';
  createdAt: string;
  // Metrics
  sessionsCountA: number;
  sessionsCountB: number;
  satisfactionA: number; // percentage
  satisfactionB: number;
  transferRateA: number; // percentage
  transferRateB: number;
  avgResponseTimeA: number; // in seconds
  avgResponseTimeB: number;
}

export interface Task {
  id: string;
  name: string;
  type: string; // e.g., '定时任务', '事件触发任务'
  targetAgentId: string; // Which agent handles this
  cronExpression: string;
  lastExecutedAt: string;
  enabled: boolean;
  actionCommand: string; // Instruction string
  /** 商家端任务 / 顾客端任务 */
  audience?: 'b' | 'c';
  /** 上次执行耗时展示，如「12s」或「-」 */
  durationLabel?: string;
}

export interface HumanStaff {
  id: string;
  name: string;
  account: string;
  workId: string;
  email: string;
  roleId: string;
  maxSlots: number; // cross-page dependency for limits
  boundAgentIds?: string[]; // Bound digital employees (HiredAgent)
}

export interface RolePermission {
  id: string;
  name: string;
  userCount: number;
  permissions: {
    [key: string]: boolean;
  };
}

/** 工作日志中的可调用资源类型 */
export type WorkLogResourceKind = 'tool' | 'kb' | 'doc' | 'skill' | 'component';

export interface ThoughtStep {
  id: string;
  time: string;
  type: 'info' | 'search' | 'tool' | 'decision' | 'output';
  message: string;
  /** 触发本轮推理的客户消息 id */
  triggerMessageId?: string;
  /** 对应绑定的员工知识 / 技能 id */
  resourceId?: string;
  /** 结构化资源：工具 / 知识库 / 文档 / 技能 / 组件 */
  resourceKind?: WorkLogResourceKind;
  resourceName?: string;
  /** 资源副标签，如「极敏感型情绪」 */
  resourceTag?: string;
}

/** AI 无法自行解决、需人工跟进的待办 */
export interface SessionTodo {
  id: string;
  title: string;
  detail?: string;
  priority: 'high' | 'normal';
  status: 'pending' | 'done';
  createdAt: string;
  triggerMessageId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'ai' | 'human' | 'system';
  name: string;
  content: string;
  timestamp: string;
  isSummary?: boolean;
}

export interface ChatSession {
  id: string;
  customerName: string;
  phoneOrEmail: string;
  scenario: string; // e.g. "售后咨询", "产品试用购买"
  avatarSeed: number;
  /** 进线渠道，用于队列列表图标 */
  channel?: 'link' | 'web' | 'chat';
  status: 'auto' | 'manual' | 'queued' | 'completed'; // auto = Auto全托管, manual = 人工接起, queued = 待接起/排队, completed = 服务完成
  messages: ChatMessage[];
  thoughtTrace: ThoughtStep[];
  /** AI 未能解决、需人工跟进的事项 */
  todos: SessionTodo[];
  assignedAgentId: string; // The active digital employee ID
  assignedStaffId?: string; // The human seat ID if transferred
  summary?: string; // Auto-generated service summary
  satisfaction?: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied';
  transferredAt?: string;
  isTransferred: boolean;
  /** 是否已加入案例库 */
  inCaseLibrary?: boolean;
  /** 加入案例库时的问题备注 */
  caseLibraryRemark?: string;
  createdAt: string;
}
