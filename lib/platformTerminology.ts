/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 京小灵平台 — 统一对外文案词表（拟人化职场语言）
 * 修改用户可见文案时优先对照本表，避免同一概念多套叫法。
 */

/** 生命周期与状态 */
export const LIFECYCLE_TERMS = {
  hire: '雇佣',
  train: '培训',
  onboardExam: '入职培训',
  onboardTest: '能力测试',
  approveOnline: '准予上岗',
  online: '上岗',
  onlineDone: '已上岗',
  pendingOnline: '待上岗',
  training: '培训中',
  serving: '接待中',
  rest: '休息',
  dismiss: '辞退员工',
  dismissConfirm: '确认辞退',
  archive: '培训存档',
  examVersion: '培训存档',
  trialRun: '试岗运行',
  completeTraining: '完成培训',
} as const;

/** 质检数字员工 */
export const QC_TERMS = {
  jobFamily: '质检',
  workspace: '质检工作台',
  overview: '概览',
  plans: '质检计划',
  sessionAudits: '会话质检',
  standard: '质检标准',
  defaultSource: '会话来源',
  capabilityTest: '会话质检',
  sourcePlatformCs: '本平台 · 客服数字员工会话',
  sourceExternal: '外部接入来源',
  targetAllOnline: '全部已上岗数字员工',
  targetSpecified: '指定数字员工',
  targetEmptyOnline: '暂无已上岗数字员工，请先让客服员工上岗后再选可检对象。',
  targetOnlineHint: '以下为当前已上岗、可被质检的数字员工',
  marketCardName: '会话质检专员',
  marketCardDesc:
    '持续检核客服数字员工的会话质量：配置质检标准与会话来源，上岗后按计划分会话检出问题并可纠错。',
  trainingHint:
    '培训需完成：① 为每条质检标准配齐字段（名称/分数/算子/模型/维度/提示词）② 在右侧能力测试中试跑。完成培训后请上岗，再在质检工作台开启计划。',
  completeBlocked:
    '请先配齐全部质检标准字段，并在右侧完成能力测试试跑。',
  standardItemFieldsHint:
    '每条二级标准须配齐：名称、分数、算子、执行模型、质检维度、提示词。',
  completeSuccess: '培训已完成。需要开始质检时，请先上岗，再进入质检工作台开启计划。',
} as const;

/** 辞退员工 — 确认弹窗与反馈 */
export const DISMISS_EMPLOYEE_COPY = {
  modalTitle: '确认辞退',
  confirmButton: LIFECYCLE_TERMS.dismissConfirm,
  body: (name: string) => `辞退 ${name} 后，将停止接待并从团队移除。`,
  successToast: '已辞退员工',
  confirmWithActiveSessions:
    '这位同事还有接待任务，辞退会影响客户体验，确定继续吗？',
} as const;

/** 导航与模块 */
export const NAV_TERMS = {
  hireWizard: '雇佣员工向导',
  employeeTraining: '员工培训',
  companyKb: '员工知识',
  skillCenter: '员工技能',
  employeeAbTest: '员工比拼',
  dataDashboard: '办公室',
  employeePerformance: '员工业绩',
  receptionRecords: '接待记录',
  dispatchChannels: '派出渠道',
  taskCenter: '任务中心',
  adminPermissions: '组织管理',
  staffAssignment: '员工分配',
  rolePermissions: '角色权限',
  onDutyMonitor: '在岗监控',
  customerPreview: '客户体验预览',
  workspace: '客服工作台',
  qcWorkspace: '质检工作台',
  myEmployees: '我的数字员工',
  employeeMarket: '数字员工市场',
} as const;

/** 顶栏 / 个人状态 */
export const HEADER_STATUS_COPY = {
  onDuty: '在岗',
  away: '暂离',
  offline: '离岗',
  dutySupervisor: '值班主管',
} as const;

/** 客服工作台 */
export const WORKSPACE_COPY = {
  agentServingCount: '数字员工接待中',
  todayTotalReception: '今日累计接待',
  responseRate30s: '30 秒应答率',
  autoServing: '数字员工接待中…',
  handBackToAuto: '交回人工接待',
  workLog: '工作日志',
  processSteps: '处理过程',
  replyResult: '回复结果',
  errorPage: '工位异常，请刷新后重试',
  aiHosting: '独立接待',
  aiHostingOn: '独立接待中',
  aiHostingToggle: '独立接待',
  sidebarWorkLog: '处理过程',
  liveReasoningHint: '披露每一句回复的理解、检索与判断过程；无法闭环转入待办',
  handBackToHuman: '交回人工接待',
} as const;

/** 老板在入职培训中为数字员工配备知识与技能 */
export const EMPLOYEE_RESOURCE_TERMS = {
  employeeKnowledge: '员工知识',
  employeeSkill: '员工技能',
  configured: '已配备',
  assignKb: '配备知识库',
  assignSkill: '配备技能',
  pickKb: '选用知识库',
  pickSkill: '选用技能',
  createKnowledgeBase: '新建知识库',
  createSkill: '新建技能',
  configuredKbList: '已配备知识库',
  configuredSkillList: '已配备技能',
  pickKbModal: '配备知识库',
  pickSkillModal: '配备技能',
  confirmAssign: '确认配备',
  removeAssigned: '移除',
  assignNone: '暂不配备',
  emptyKb: '还没配备知识',
  emptySkill: '还没配备技能',
  configKbHint:
    '入职培训时，为这名员工配备接待时可检索的知识资料。可「配备知识库」从团队选用，或「新建知识库」上传文档。',
  configSkillHint:
    '入职培训时，为这名员工配备可调用的流程与工具能力。可「配备技能」从团队选用，或「新建技能」自行创建。',
  onboardingTags: '入职标签',
  openingLine: '开场白',
  openingLineHint: '同事接待客户时的第一句话',
  fallbackLine: '应急话术',
  fallbackLineHint: '同事答不上来或超时时的备用回复',
  thinkTimeoutSec: '思考时限（秒）',
  profileInfo: '档案信息',
  roleDescription: '岗位说明',
  employeeDescription: '员工描述',
  modelLabel: '模型',
  masterTemplateLabel: '母版',
  search: '检索',
  workLog: '工作日志',
} as const;

/** 数字员工列表 / 详情页 */
export const EMPLOYEE_PAGE_COPY = {
  pageTitle: NAV_TERMS.myEmployees,
  hireButton: '雇佣员工',
  emptyList: '还没有同事入职',
  emptyHint: '点击上方数字员工市场，即可快速雇佣数字员工',
  searchPlaceholder: '按姓名查找数字员工…',
  /** 相对市场雇佣 / 平台代做定制：老板自己空白起盘 */
  createFromScratch: '自建数字员工',
  hireSuccess: '雇佣成功',
  approveSuccess: '已准予上岗',
  testPlaceholder: '跟同事练几轮，看看上岗准备得怎么样…',
  testing: '能力测试中…',
  approveConfirm:
    '确认让这位同事正式上岗吗？上岗后即可接待真实客户。',
  noMatch: '没找到匹配的同事',
} as const;

/** 任务中心 */
export const TASK_CENTER_COPY = {
  title: NAV_TERMS.taskCenter,
  subtitle: '安排同事下班后的自动化工作，定时巡检、回访、工单跟进',
  createTask: '新建任务',
  discardTask: '终止任务',
  emptyList: '还没有安排任务，同事下班也能自动干活',
  emptyHint: '说说希望同事自动完成什么…',
  cronSchedule: '定时任务',
  statusRunning: '进行中',
  statusDiscarded: '已终止',
  executionLog: '任务工作日志',
  discardConfirm: '确定终止任务吗？终止后将停止执行并收入历史记录。',
  discardedToast: '任务已终止。',
} as const;

/** 员工技能 */
export const SKILL_PAGE_COPY = {
  title: NAV_TERMS.skillCenter,
  subtitle: '为团队配备技能，同事上岗即可调用',
  tabTeam: '团队技能',
  tabMarket: '技能市场',
  createSkill: '新建技能',
  emptyList: '团队还没有技能，新建或去市场订阅',
  emptyHint: '点右上角新建技能，用自然语言描述能力即可',
  marketDesc:
    '各行业客服场景沉淀的技能，一键订阅就能给同事配备',
  boundBlockTitle: '已配备此技能的同事',
  emptyBound: '暂无同事配备此技能',
  createSuccess: '技能已发布并加入团队',
  deleteBlocked: '已有同事配备此技能，无法删除',
} as const;

/** 员工知识 */
export const KB_PAGE_COPY = {
  title: NAV_TERMS.companyKb,
  createKb: '新建知识库',
  emptyList: '还没有知识资料，建一个库给同事培训用',
  tabDocs: '资料',
  tabBasic: '基础信息',
  tabParse: '解析设置',
  tabRecall: '检索设置',
  docsHint: '管理这位同事可调用的全部资料',
} as const;

/** 员工比拼 */
export const ABTEST_COPY = {
  title: NAV_TERMS.employeeAbTest,
  emptyList: '还没有安排比拼，选两位同事比比接待效果',
  create: '新建比拼',
  edit: '修改比拼',
  result: '比拼结果',
  experimentList: '比拼列表',
  runSimulation: '运行仿真',
} as const;

/** 办公室 / 数据 */
export const DASHBOARD_COPY = {
  title: NAV_TERMS.dataDashboard,
  subtitle: NAV_TERMS.employeePerformance,
  sessionVolume: '接待量',
  resolutionRate: '解决率',
  sessionList: '接待记录列表',
  transferRate: '转同事接待率',
} as const;

/** 在岗监控 */
export const MONITOR_COPY = {
  title: NAV_TERMS.onDutyMonitor,
  subtitle: '查看各位同事的实例是否在岗、运行是否正常',
  onDuty: '在岗',
  offDuty: '离岗',
  abnormal: '异常离岗',
} as const;

/** 组织管理 / 员工分配 */
export const ORG_COPY = {
  staffPageTitle: NAV_TERMS.staffAssignment,
  rolePageTitle: NAV_TERMS.rolePermissions,
  bindAgents: '协同数字员工',
  bindAgentsHint: '为值班同事配备协同数字员工，可多选',
  addStaff: '添加值班同事',
  selectStaff: '选择值班同事 *',
  selectStaffRequired: '请至少选择一位值班同事。',
  bulkBindHint:
    '选择一个已上岗的数字员工，勾选要协同的值班同事，系统会追加到各同事的配备列表（不会覆盖已有配备）。',
  bulkBindSuccess: (agentName: string, count: number) =>
    `已将「${agentName}」批量配备给 ${count} 位值班同事。`,
  bindStaffSuccess: (name: string) =>
    `已成功配备值班同事 [${name}]。超出双线保障时系统会自动转接给该接管人！`,
  transferChannelDesc: '会话转入客服工作台，由已配备的值班同事接力接待',
  transferChannelHint:
    '会话将出现在导航栏底部「客服工作台」，由值班同事接管继续服务',
} as const;

/** 客服工作台 — 会话系统消息 */
export const SESSION_COPY = {
  angryTransfer: '检测到客户情绪激昂，已关闭独立接待，转接值班同事排队入线。',
  transferToStaff: (name: string) =>
    `会话已成功由数字员工转交给值班同事 [${name}]，独立接待已关闭。`,
  transferTrace: (workId: string, name: string) =>
    `同事强制接起：转案至工号 [${workId}] 的值班同事 ${name}。`,
  autoPilotOn: '管理员重新开启独立接待，数字员工继续接待，人工变更为旁听模式。',
  autoPilotOff: '管理员主动干预：关闭独立接待，启用纯人工输入。',
  staffReply: (name: string, preview: string) =>
    `值班同事 [${name}] 于前台解析回复客户："${preview}..."`,
} as const;

/** 搜索无结果 */
export const SEARCH_COPY = {
  noKb: '没找到匹配的知识库',
  noSkill: '没找到匹配的技能',
  noDoc: '没找到匹配的文档',
  noColleague: '没找到匹配的同事',
} as const;

/** 数字员工母版能力升级 */
export const MASTER_TEMPLATE_TERMS = {
  releaseNotes: '【母版更新说明】',
  dismiss: '暂不处理',
  syncUpgrade: '同步母版升级',
  dismissToast: '已暂不处理本次母版升级',
  syncToast: '已同步至最新母版能力',
} as const;

/** 同步母版升级 — 确认弹窗 */
export const SYNC_EMPLOYEE_UPGRADE_COPY = {
  modalTitle: '确认同步母版升级',
  confirmButton: '确定',
  body: '确认同步到最新母版吗？同步后将进入培训，您可以选择保存或放弃更改。',
} as const;

export function masterTemplateUpgradeNotice(version: string): string {
  return `母版能力有更新（${version}），要同步到这位同事吗？`;
}

/** 全站通用反馈 */
export const FEEDBACK_COPY = {
  irreversible: '此操作不可恢复',
  noSearchResult: EMPLOYEE_PAGE_COPY.noMatch,
} as const;

/** 禁止混用的旧词 → 统一替换 */
export const DEPRECATED_TERM_MAP: Record<string, string> = {
  数字员工创建引导: NAV_TERMS.hireWizard,
  培训中心: NAV_TERMS.employeeTraining,
  AI工作台: NAV_TERMS.workspace,
  接待工作台: NAV_TERMS.workspace,
  技能管理: NAV_TERMS.skillCenter,
  知识库: NAV_TERMS.companyKb,
  'A/B测试': NAV_TERMS.employeeAbTest,
  'A/B 测试': NAV_TERMS.employeeAbTest,
  员工管理: NAV_TERMS.adminPermissions,
  运营看板: NAV_TERMS.employeePerformance,
  会话管理: NAV_TERMS.receptionRecords,
  实例监控: NAV_TERMS.onDutyMonitor,
  数据汇总: NAV_TERMS.dataDashboard,
  挂载知识资料: EMPLOYEE_RESOURCE_TERMS.assignKb,
  赋予特有技能: EMPLOYEE_RESOURCE_TERMS.assignSkill,
  '暂不挂载 (纯空闲)': EMPLOYEE_RESOURCE_TERMS.assignNone,
  绑定员工知识: EMPLOYEE_RESOURCE_TERMS.assignKb,
  分配员工技能: EMPLOYEE_RESOURCE_TERMS.assignSkill,
  关联知识库: EMPLOYEE_RESOURCE_TERMS.configuredKbList,
  关联技能: EMPLOYEE_RESOURCE_TERMS.configuredSkillList,
  挂载知识: EMPLOYEE_RESOURCE_TERMS.assignKb,
  绑定已有: EMPLOYEE_RESOURCE_TERMS.pickKb,
  分配已有: EMPLOYEE_RESOURCE_TERMS.pickSkill,
  学习知识: EMPLOYEE_RESOURCE_TERMS.assignKb,
  学习技能: EMPLOYEE_RESOURCE_TERMS.assignSkill,
  学习已有: EMPLOYEE_RESOURCE_TERMS.pickKb,
  添加已有: EMPLOYEE_RESOURCE_TERMS.assignKb,
  个性化配置: LIFECYCLE_TERMS.onboardExam,
  员工详情配置: LIFECYCLE_TERMS.onboardExam,
  入职考核: LIFECYCLE_TERMS.onboardExam,
  对话测试: LIFECYCLE_TERMS.onboardTest,
  版本快照: LIFECYCLE_TERMS.archive,
  版本记录: LIFECYCLE_TERMS.archive,
  版本管理: LIFECYCLE_TERMS.examVersion,
  渠道部署: NAV_TERMS.dispatchChannels,
  人设: EMPLOYEE_RESOURCE_TERMS.onboardingTags,
  召回: EMPLOYEE_RESOURCE_TERMS.search,
  挂载: '配备',
  绑定: '配备',
  学习: '配备',
  配置: '配备',
  投喂: '上传文档',
  沙箱: LIFECYCLE_TERMS.onboardTest,
  Agent: '数字员工',
  'B 端': '商家端',
  'C 端': '顾客端',
  自闭环: '独立接待',
  全托管: '独立接待',
  托管: '独立接待',
  Cron: '定时任务',
  子代理: '协作任务',
  模版: '母版',
  模板: '母版',
  发版说明: MASTER_TEMPLATE_TERMS.releaseNotes,
  发布: LIFECYCLE_TERMS.approveOnline,
  已上线: LIFECYCLE_TERMS.onlineDone,
  待上线: LIFECYCLE_TERMS.pendingOnline,
  草稿: LIFECYCLE_TERMS.training,
  创建员工: EMPLOYEE_PAGE_COPY.hireButton,
  新建员工: EMPLOYEE_PAGE_COPY.hireButton,
  删除员工: LIFECYCLE_TERMS.dismiss,
  试运行: LIFECYCLE_TERMS.trialRun,
  真人坐席: NAV_TERMS.staffAssignment,
  角色管理: NAV_TERMS.rolePermissions,
  执行过程: WORKSPACE_COPY.processSteps,
  应答结果: WORKSPACE_COPY.replyResult,
  'Agent 执行记录': WORKSPACE_COPY.workLog,
};
