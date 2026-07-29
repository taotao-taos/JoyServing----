export type Role = 'manager' | 'first_inspector' | 're_inspector' | 'operator' | 'csr';
export type Tab = 'overview' | 'tasks' | 'workflow' | 'appeals';

export const ROLE_LABELS: Record<Role, string> = {
  manager: '质检中心主管（全权管理员）',
  first_inspector: '人工初审专员（业务一审）',
  re_inspector: '争议复审专家（申诉仲裁）',
  operator: '系统集成运营（数据运维）',
  csr: '一线客服坐席（被检员工）'
};

// 1. 数据源接入管道
export interface DataSource {
  id: string;
  name: string;
  type: 'manual_voice' | 'manual_chat' | 'digital_chat' | 'digital_voice' | 'unified_chat' | 'wechat' | 'feishu' | 'dingtalk' | 'voice' | 'webchat' | string;
  status: 'active' | 'inactive' | 'error';
  syncFrequency: string; // "实时同步" | "每小时" | "每日"
  totalRecords: number;
  lastSyncTime: string;
  errorMsg?: string;
  createdAt?: string;
  modifier?: string;
  modifiedAt?: string;
  agentName?: string;
  config: {
    apiUrl: string;
    authType: string;
    rateLimit: string;
  };
}

// 2. 质检规则评分模板
export interface QualityTemplate {
  id: string;
  name: string;
  creator: string;
  updateTime: string;
  description: string;
  isActive: boolean;
  weights: {
    greeting: number;      // 礼貌规范权重 (.., 10)
    compliance: number;    // 流程合规权重 (.., 40)
    accuracy: number;      // 业务准确权重 (.., 50)
    timeoutPenalty: number; // 超时单次扣分 (.., -10)
    bannedPenalty: number;  // 禁用词单次扣分 (.., -20)
  };
  bannedWords: string[];
  requiredKeywords: string[];
}

// 3. 质检抽检任务/批次
export interface QualityCampaign {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  dataSourceId: string;
  templateId: string;
  scope: string; // "今日全量" | "3 10% 抽样" | "高投诉全检"
  progress: number; 
  totalVolume: number;
  inspectedVolume: number;
  warningCount: number;
  averageScore: number;
  createdAt: string;
}

// 4. 具体待办会话任务
export interface AuditTask {
  id: string;
  campaignId: string;
  sessionID: string;
  agentName: string;
  agentId: string;
  group: string;
  time: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  status: 'pending' | 'warning' | 'appealing' | 'approved' | 'rejected' | 'resolved';
  aiScore: number;
  finalScore?: number;
  reviewComment?: string; 
  appealReason?: string;  
  appealTime?: string;
  transcript: { role: 'agent' | 'user' | 'system'; text: string; time: string }[];
  scoreBreakdown: {
    greeting: number;
    compliance: number;
    accuracy: number;
    timeoutPenalty: number;
    bannedPenalty: number;
  };
  sessionType?: 'human' | 'digital';
  intentCategory?: string;
  tags?: string[];
}

// 5. 坐席服务辅导任务 (闭环整治)
export interface CoachingTask {
  id: string;
  agentName: string;
  agentId: string;
  group: string;
  coachName: string;
  relatedSessionID: string;
  scoreBefore: number;
  issueType: '禁语违规' | '业务解答错误' | '严重超时' | '态度冷漠';
  status: 'to_be_coached' | 'coaching' | 'completed';
  assignedTime: string;
  completedTime?: string;
  coachingPlan: string; // 辅导方案
  agentFeedback?: string; // 客服反馈
}
