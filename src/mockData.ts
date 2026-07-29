/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentMarketInfo, HiredAgent, KnowledgeBase, Skill, ABTest, Task, HumanStaff, RolePermission, ChatSession } from './types';
import { defaultFallbackScriptForAgent, defaultOpeningLineForAgent } from '@/lib/agentDefaultCopy';

/** 数字员工默认大语言模型（档案 / 更多设置展示） */
export const DEFAULT_AGENT_MODEL = 'Qwen3.6-35B-A3B';

/** 食安险数字员工默认入职标签（培训 / 雇佣时注入） */
export const FOOD_SAFETY_AGENT_DEFAULTS = {
  avatar: '🛡️',
  description:
    '专注餐饮商户食安责任险咨询，解答保障范围、保费方案、投保条件与理赔流程，协助完成线上报案与材料指引。',
  persona:
    '你是食安险智能客服顾问，服务餐饮、团餐、外卖等商户。负责解答食安责任险的保障范围、保费档位、免赔条款、理赔申请与材料要求。遇到复杂核保或诉讼风险时，引导联系专属客户经理或人工坐席。',
  languageStyle: '专业严谨、温和耐心、少用晦涩术语',
  constraints: '不承诺必然赔付；不提供法律意见；超出保单条款时如实说明并转人工',
  backgroundKnowledge:
    '已绑定食安险 FAQ、产品说明手册与理赔流程员工知识；回答须优先引用上述材料，并区分「保障范围 / 保费 / 理赔材料」三类问题。',
  workflowNotes:
    '触发「理赔、吃坏、报案」等关键词时调用食安险快速理赔测算器；情绪升级时转人工坐席。',
} as const;

/** 质检数字员工默认培训配置 */
const QC_MARKET_DESC =
  '持续检核客服数字员工的会话质量：配置质检标准与会话来源，上岗后按计划分会话检出问题并可纠错。';

export const QC_AGENT_DEFAULTS = {
  avatar: '🔎',
  description: QC_MARKET_DESC,
  persona:
    '你是会话质检专员，按既定标准对客服数字员工的会话做 AI 初筛与问题标注，输出分数与违规点，供运营纠错与改进。',
  languageStyle: '客观、条目清晰、少主观评价',
  constraints: '不代替客服接待客户；不擅自改写被检会话原文；越权范围外的对象不检',
} as const;

export const INITIAL_MARKET_AGENTS: AgentMarketInfo[] = [
  {
    id: 'm_qc_session',
    name: '会话质检专员',
    avatar: '🔎',
    description: QC_MARKET_DESC,
    category: 'ready',
    jobFamily: 'quality_inspection',
    capabilities: ['质检标准配置', '本平台会话来源', 'AI 分会话初筛', '结果纠错留痕'],
  },
  {
    id: 'm_sales',
    name: '食安险商户顾问',
    avatar: '👩‍💼',
    description: '5年保险经纪经验，擅长为餐饮连锁客户定制食安责任险方案，解答保费、加保与续保问题。',
    category: 'ready',
    jobFamily: 'customer_service',
    capabilities: ['方案定制报价', '续保加保咨询', '门店风险初评', '客户经理协同']
  },
  {
    id: 'm_content',
    name: '食安险客服专员',
    avatar: '🛡️',
    description: FOOD_SAFETY_AGENT_DEFAULTS.description,
    category: 'ready',
    jobFamily: 'customer_service',
    capabilities: ['保障范围解读', '保费方案测算', '理赔材料指引', '食安投诉情绪安抚'],
    templateVersion: 'V_1780034193170',
    templateReleaseNotes:
      '新增食安投诉情绪分级与自动升级转人工策略\n优化理赔测算技能调用链路，支持多票据合并测算\n补充 2026 版产品手册检索优先级与兜底话术',
  },
  {
    id: 'm_assistant',
    name: '通用个人助理',
    avatar: '🔮',
    description: '适合作为团队通用助理：可定制岗位职责与技能组合，统筹待办、整理会议要点，并长期记住业务上下文。',
    category: 'ready',
    capabilities: ['多线程流程统筹', '技能组合派发', '会议精要生成', '长期业务上下文记忆']
  },
  {
    id: 'm_content_expert',
    name: '内容运营专家',
    avatar: '💅',
    description: '专注热点追踪与多平台内容生产，把撰稿、分发与复盘串成一条可自动运转的运营流水线。',
    category: 'ready',
    capabilities: ['跨渠道协同调度', '动态热点追踪', '跨媒体智能分流', '运营链路复盘']
  },
  {
    id: 'm_data',
    name: '数据分析大师',
    avatar: '👨‍🔬',
    description: '帮团队清洗、关联业务数据，自动输出洞察报告，并对异常波动给出预警与趋势研判。',
    category: 'custom',
    capabilities: ['多维异动诊断', 'SQL复杂表关联', '自动生成洞察大盘', '时序负荷预测']
  },
  {
    id: 'm_wechat',
    name: '企微私域客服',
    avatar: '🙋‍♂️',
    description: '嵌入企微社群，即时回答高频咨询，识别潜在客户意向，配合话术库维持高留存。',
    category: 'custom',
    capabilities: ['客户流失拦截', '裂变营销转化追踪', '高频话术无重合库', '企微风控敏感词监控']
  },
  {
    id: 'm_creative',
    name: '内容创作大师',
    avatar: '👩‍🎨',
    description: '按小红书、抖音、B站等平台文风，生成高点击标题、短视频分镜与多渠道文案变体。',
    category: 'custom',
    capabilities: ['高点击率标题生成', '短视频分镜脑暴', '多源信息提取扩写', '文风格调无损转化']
  },
  {
    id: 'm_leads',
    name: '线索洞察专家',
    avatar: '🕵️‍♂️',
    description: '汇总各渠道线索，实时分级意向度，跟踪销售漏斗健康度并给出跟进建议。',
    category: 'custom',
    capabilities: ['意向度动态漏斗', '全网多模态线索追溯', '赢单概率预测估算', '失单溯源与归因']
  },
  {
    id: 'm_hotline',
    name: '热线客服',
    avatar: '🎧',
    description: '快速响应呼入咨询，识别客户情绪与关键诉求，精准应答并完成工单关联。',
    category: 'custom',
    capabilities: ['超清文字实时互转', '智能打断防冲突', '情绪降噪缓冲', '呼入路由精准调度']
  },
  {
    id: 'm_outbound',
    name: '外呼专员',
    avatar: '🎙️',
    description: '批量外呼触达，按多分支话术流转沟通，识别拒接与意向并自动打标回访。',
    category: 'custom',
    capabilities: ['高维话术路径流转', '拒接拦截应对话术', '自动回访并挂机', '全量音频意图打标']
  }
];

export const INITIAL_HIRED_AGENTS: HiredAgent[] = [
  {
    id: 'h_food_safety',
    name: '食安险客服专员',
    marketId: 'm_content',
    agentId: 'AGENT_103',
    avatar: FOOD_SAFETY_AGENT_DEFAULTS.avatar,
    description: FOOD_SAFETY_AGENT_DEFAULTS.description,
    persona: FOOD_SAFETY_AGENT_DEFAULTS.persona,
    languageStyle: FOOD_SAFETY_AGENT_DEFAULTS.languageStyle,
    constraints: FOOD_SAFETY_AGENT_DEFAULTS.constraints,
    openingLine: defaultOpeningLineForAgent('食安险客服专员'),
    fallbackScript: defaultFallbackScriptForAgent(),
    backgroundKnowledge: FOOD_SAFETY_AGENT_DEFAULTS.backgroundKnowledge,
    workflowNotes: FOOD_SAFETY_AGENT_DEFAULTS.workflowNotes,
    skills: ['s_claim', 's_emotion'],
    knowledgeBases: ['kb_faq', 'kb_product', 'kb_claim'],
    status: 'online',
    hiredAt: '2026-06-01 10:00',
    syncedTemplateVersion: 'V_1780010000000',
  },
  {
    id: 'h_sales',
    name: '食安险商户顾问',
    marketId: 'm_sales',
    agentId: 'AGENT_101',
    avatar: '👩‍💼',
    description: '5年保险经纪经验，负责餐饮连锁客户的食安责任险方案定制、续保与加保咨询。',
    persona: FOOD_SAFETY_AGENT_DEFAULTS.persona,
    languageStyle: FOOD_SAFETY_AGENT_DEFAULTS.languageStyle,
    constraints: FOOD_SAFETY_AGENT_DEFAULTS.constraints,
    openingLine: defaultOpeningLineForAgent('食安险商户顾问'),
    fallbackScript: defaultFallbackScriptForAgent(),
    skills: ['s_claim', 's_crm', 's_emotion'],
    knowledgeBases: ['kb_faq', 'kb_product', 'kb_claim'],
    status: 'online',
    hiredAt: '2026-06-05 14:12'
  },
  {
    id: 'h_wechat',
    name: '双十一企微专属小助手',
    marketId: 'm_wechat',
    agentId: 'AGENT_102',
    avatar: '🙋‍♂️',
    description: '主要负责解答高频日常企微用户咨询，搜集潜在高品质线索，分流非核心故障至客服。',
    skills: ['s_emotion'],
    knowledgeBases: ['kb_faq'],
    status: 'online',
    hiredAt: '2026-06-10 18:30'
  }
];

/** 母版升级演示种子版本 —  bump 后重置「食安险客服专员」的母版同步状态 */
export const TEMPLATE_DEMO_SEED_VERSION = 'v1-master-upgrade';

export const KB_SEED_VERSION = 'v2-20-fix';

export const INITIAL_KNOWLEDGE_BASES: KnowledgeBase[] = [
  {
    id: 'kb_faq',
    name: '食安险常见问题解答 (FAQ)',
    firstChar: '食',
    docCount: 15,
    wordCount: 12500,
    updatedAt: '2026-06-10 11:30',
  },
  {
    id: 'kb_product',
    name: '食安责任险产品说明手册 2026',
    firstChar: '产',
    docCount: 42,
    wordCount: 98000,
    updatedAt: '2026-06-08 09:25',
  },
  {
    id: 'kb_claim',
    name: '食安险理赔流程与材料清单',
    firstChar: '理',
    docCount: 8,
    wordCount: 4500,
    updatedAt: '2026-06-03 16:40',
  },
  {
    id: 'kb_vip',
    name: '餐饮商户加保与费率优惠条款',
    firstChar: '加',
    docCount: 6,
    wordCount: 2200,
    updatedAt: '2026-05-28 10:15',
  },
  {
    id: 'kb_underwriting',
    name: '食安险核保规则与拒保情形',
    firstChar: '核',
    docCount: 12,
    wordCount: 8600,
    updatedAt: '2026-06-09 14:20',
  },
  {
    id: 'kb_exclusion',
    name: '责任免除条款对照表',
    firstChar: '免',
    docCount: 5,
    wordCount: 3100,
    updatedAt: '2026-06-07 11:05',
  },
  {
    id: 'kb_restaurant',
    name: '餐饮业态分级承保指引',
    firstChar: '餐',
    docCount: 18,
    wordCount: 14200,
    updatedAt: '2026-06-06 09:40',
  },
  {
    id: 'kb_catering',
    name: '团餐与中央厨房专项条款',
    firstChar: '团',
    docCount: 9,
    wordCount: 6700,
    updatedAt: '2026-06-05 16:55',
  },
  {
    id: 'kb_employee',
    name: '雇主责任与员工工伤衔接说明',
    firstChar: '雇',
    docCount: 7,
    wordCount: 4800,
    updatedAt: '2026-06-04 10:30',
  },
  {
    id: 'kb_food_chain',
    name: '供应链食安追溯与投保要求',
    firstChar: '供',
    docCount: 14,
    wordCount: 11300,
    updatedAt: '2026-06-02 15:18',
  },
  {
    id: 'kb_recall',
    name: '食品召回与舆情应对手册',
    firstChar: '召',
    docCount: 11,
    wordCount: 9200,
    updatedAt: '2026-06-01 08:45',
  },
  {
    id: 'kb_inspection',
    name: '食药监检查应对与整改模板',
    firstChar: '检',
    docCount: 16,
    wordCount: 12800,
    updatedAt: '2026-05-30 13:22',
  },
  {
    id: 'kb_contract',
    name: '商户合作协议与特约条款',
    firstChar: '协',
    docCount: 10,
    wordCount: 7600,
    updatedAt: '2026-05-29 17:10',
  },
  {
    id: 'kb_renewal',
    name: '续保提醒与费率调整政策',
    firstChar: '续',
    docCount: 4,
    wordCount: 1900,
    updatedAt: '2026-05-27 09:00',
  },
  {
    id: 'kb_channel',
    name: '渠道代理销售话术与合规要点',
    firstChar: '渠',
    docCount: 13,
    wordCount: 10400,
    updatedAt: '2026-05-26 14:35',
  },
  {
    id: 'kb_case',
    name: '典型理赔案例库（2024-2026）',
    firstChar: '案',
    docCount: 28,
    wordCount: 35600,
    updatedAt: '2026-06-10 08:15',
  },
  {
    id: 'kb_medical',
    name: '急性肠胃炎就医与票据规范',
    firstChar: '医',
    docCount: 6,
    wordCount: 3400,
    updatedAt: '2026-05-25 11:50',
  },
  {
    id: 'kb_legal',
    name: '食安纠纷法律咨询摘要',
    firstChar: '法',
    docCount: 9,
    wordCount: 7100,
    updatedAt: '2026-05-24 16:08',
  },
  {
    id: 'kb_training',
    name: '新员工食安险产品培训讲义',
    firstChar: '培',
    docCount: 22,
    wordCount: 18700,
    updatedAt: '2026-05-23 10:20',
  },
  {
    id: 'kb_glossary',
    name: '食安险术语与缩写对照表',
    firstChar: '术',
    docCount: 3,
    wordCount: 1200,
    updatedAt: '2026-05-22 09:30',
  },
];

export const INITIAL_SKILLS: Skill[] = [
  {
    id: 's_claim',
    name: '食安险快速理赔测算器',
    author: '保险科技官方',
    updatedAt: '2026-06-09 17:00',
    usedByAgents: ['食安险商户顾问', '食安险客服专员'],
    type: 'subscribed',
    description: '根据保单免赔额、医疗费用票据与责任认定结果，自动测算预估赔付金额并生成报案摘要。'
  },
  {
    id: 's_crm',
    name: '餐饮商户 CRM 保单信息同步',
    author: '企业自研部门',
    updatedAt: '2026-06-05 12:45',
    usedByAgents: ['食安险商户顾问'],
    type: 'mine',
    description: '将对话中识别的门店信息、保单号与续保意向，自动同步至商户 CRM 与客户经理跟进表。'
  },
  {
    id: 's_emotion',
    name: '食安投诉情绪监测与升级转人工',
    author: 'AI NLP 联合实验室',
    updatedAt: '2026-06-10 15:30',
    usedByAgents: ['食安险商户顾问', '食安险客服专员', '双十一企微专属小助手'],
    type: 'subscribed',
    description: '识别食安事故、群体投诉与激烈言辞，达到风险阈值时自动升级至理赔专员人工坐席。'
  },
  {
    id: 's_outbound',
    name: '全功能自动外呼拨号挂机联动工具',
    author: '极速语音联合会',
    updatedAt: '2026-04-12 18:00',
    usedByAgents: [],
    type: 'market',
    description: '调取IP网关直接呼叫客户，挂断后自动记录话单并提取音频全文摘要，多维画像标注。'
  }
];

export const INITIAL_AB_TESTS: ABTest[] = [
  {
    id: 'ab_001',
    name: '企微客服（新大模型） VS 销售专家（基础模型）流控测试',
    agentAId: 'h_wechat',
    agentBId: 'h_sales',
    ratioA: 40,
    ratioB: 60,
    status: 'paused',
    createdAt: '2026-06-01',
    sessionsCountA: 540,
    sessionsCountB: 810,
    satisfactionA: 92.5,
    satisfactionB: 87.2,
    transferRateA: 18.4,
    transferRateB: 29.8,
    avgResponseTimeA: 1.1,
    avgResponseTimeB: 2.3
  },
  {
    id: 'ab_002',
    name: '升级新版 FAQ 知识库调优转化对比测试',
    agentAId: 'h_sales', // With old FAQ
    agentBId: 'h_sales', // High density
    ratioA: 50,
    ratioB: 50,
    status: 'running',
    createdAt: '2026-06-09',
    sessionsCountA: 1240,
    sessionsCountB: 1215,
    satisfactionA: 84.1,
    satisfactionB: 94.6,
    transferRateA: 34.2, // Transfer rate is lower for B (better!)
    transferRateB: 21.0,
    avgResponseTimeA: 1.8,
    avgResponseTimeB: 1.4
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't_service_summary',
    name: '服务小结',
    type: '定时任务',
    targetAgentId: 'h_food_insurance',
    cronExpression: 'cron: 0 0 14 * * ?',
    lastExecutedAt: '2026-06-08 20:00:48',
    enabled: false,
    actionCommand: '汇总当日客服会话要点，生成服务小结并推送至企微群。',
    audience: 'b',
    durationLabel: '-',
  },
  {
    id: 't_001',
    name: '日终意向线索自动同步到销售大盘',
    type: '定时任务',
    targetAgentId: 'h_sales',
    cronExpression: '0 22 * * * (每天 22:00)',
    lastExecutedAt: '2026-06-10 22:00:15',
    enabled: true,
    actionCommand: '扫描检索过去 24 小时标记为高意向 (Hot) 客户聊天记录，解析预算及购买诉求，同步至CRM大盘。',
    audience: 'b',
    durationLabel: '18s',
  },
  {
    id: 't_002',
    name: '沉睡30天VIP会员专属运营企微自动发送',
    type: '事件触发任务',
    targetAgentId: 'h_wechat',
    cronExpression: '客户进入沉睡标签时 (触发式)',
    lastExecutedAt: '2026-06-11 02:40:11',
    enabled: false,
    actionCommand: '调用限时福利包，通过企微通道单独关怀沉睡30天的高净值VIP，并监控回复信号。',
    audience: 'c',
    durationLabel: '42s',
  },
];

export const INITIAL_HUMAN_STAFF: HumanStaff[] = [
  {
    id: 'hs_001',
    name: 'TAOs (当前登录)',
    account: 'admin_taos',
    workId: 'STAFF_001',
    email: 'z790591751@gmail.com',
    roleId: 'r_admin',
    maxSlots: 8
  },
  {
    id: 'hs_002',
    name: '李晓明',
    account: 'agent_xiaoming',
    workId: 'STAFF_002',
    email: 'xm.li@joyserving.com',
    roleId: 'r_agent',
    maxSlots: 5
  },
  {
    id: 'hs_003',
    name: '张华军',
    account: 'agent_huajun',
    workId: 'STAFF_003',
    email: 'hj.zhang@joyserving.com',
    roleId: 'r_agent',
    maxSlots: 5
  },
  {
    id: 'hs_004',
    name: '王美琪',
    account: 'agent_meiqi',
    workId: 'STAFF_004',
    email: 'mq.wang@joyserving.com',
    roleId: 'r_agent',
    maxSlots: 10
  }
];

export const INITIAL_ROLES: RolePermission[] = [
  {
    id: 'r_admin',
    name: '超级管理员',
    userCount: 53,
    permissions: {
      market: true,
      agents: true,
      kb: true,
      skills: true,
      abTest: true,
      tasks: true,
      staff: true,
      roles: true,
      workspace: true,
      dashboard: true,
      sessions: true,
    }
  },
  {
    id: 'r_agent',
    name: '客服主力坐席',
    userCount: 18,
    permissions: {
      market: false,
      agents: true,
      kb: true,
      skills: false,
      abTest: false,
      tasks: false,
      staff: false,
      roles: false,
      workspace: true,
      dashboard: true,
      sessions: true,
    }
  },
  {
    id: 'r_skill_agent',
    name: '人工 Skill 联动接待员',
    userCount: 5,
    permissions: {
      market: false,
      agents: false,
      kb: true,
      skills: true,
      abTest: false,
      tasks: true,
      staff: false,
      roles: false,
      workspace: true,
      dashboard: false,
      sessions: false,
    }
  }
];

export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 's_user_001',
    customerName: '何家豪',
    phoneOrEmail: '138****9281',
    scenario: '售后纠纷及设备损坏',
    avatarSeed: 12,
    channel: 'link',
    status: 'queued',
    isTransferred: false,
    inCaseLibrary: true,
    caseLibraryRemark: '客户反馈设备开箱即故障，疑似翻新机争议，典型售后纠纷案例。',
    assignedAgentId: 'h_sales',
    createdAt: '2026-06-11 05:40',
    messages: [
      {
        id: 'msg_001_1',
        sender: 'customer',
        name: '何家豪',
        content: '你好，我上周在你们这买的智能款 JoyServing 网关，为什么一插电源就无限闪退？今天屏幕甚至都无法亮起了。',
        timestamp: '05:40:12'
      },
      {
        id: 'msg_001_2',
        sender: 'ai',
        name: '产品销售服务官',
        content: '您好！何家豪先生。我是您的数字销售服务助手。得知这一情况我感到非常抱歉！一插电即无限闪退通常可能是网关电流输入不稳或者核心固件升级中断导致的。您可以尝试以下几点：\n1. 检查是否使用的官方标配电源适配器。\n2. 拔掉网线，长按背部的 Reset 按键 10 秒看能否强行唤醒复位。\n\n请问上述方式您已经尝试过了吗？',
        timestamp: '05:41:00'
      },
      {
        id: 'msg_001_3',
        sender: 'customer',
        name: '何家豪',
        content: '全都试过了，根本没用！而且我买的是全新款，你们怎么寄给我一个插口磨损这么严重的退货机？我现在要求立刻给我退货，并进行三倍赔偿，不然我马上去工商局举报你们，叫你们经理出来！💢',
        timestamp: '05:42:15'
      }
    ],
    thoughtTrace: [
      {
        id: 'tt_1',
        time: '05:42:15',
        type: 'info',
        message: '外部客户 何家豪 进线，识别愤怒情绪与退货、三倍赔偿诉求，需核对商品与订单信息。',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_2',
        time: '05:42:16',
        type: 'search',
        message: '检索员工知识与订单文档',
        resourceKind: 'kb',
        resourceName: '食安险理赔流程与材料清单',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_2b',
        time: '05:42:16',
        type: 'search',
        message: '索引订单与仓储出库记录',
        resourceKind: 'doc',
        resourceName: 'JoyServing 网关出库单 #GW-9281',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_3',
        time: '05:42:17',
        type: 'tool',
        message: '调用情绪监测组件',
        resourceKind: 'component',
        resourceName: 'NLP 情绪感知组件',
        resourceTag: '极敏感型情绪',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_4',
        time: '05:42:18',
        type: 'decision',
        message: '判定：强烈怒火与敏感词命中红线，超出数字员工授权，无法直接闭环，转入待办由同事跟进（不转人工）。',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_5',
        time: '05:42:19',
        type: 'tool',
        message: '生成待办',
        resourceKind: 'tool',
        resourceName: '待办工单',
        resourceTag: '紧急 ×2',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'tt_6',
        time: '05:42:19',
        type: 'output',
        message: '发送安抚说明，告知已登记待办、会尽快核实处理',
        triggerMessageId: 'msg_001_3',
      }
    ],
    todos: [
      {
        id: 'todo_001_1',
        title: '核实设备是否为翻新机',
        detail: '客户质疑收到退货机，需仓储溯源',
        priority: 'high',
        status: 'pending',
        createdAt: '05:42:19',
        triggerMessageId: 'msg_001_3',
      },
      {
        id: 'todo_001_2',
        title: '处理三倍赔偿诉求',
        detail: '超出 AI 权限，需主管审批',
        priority: 'high',
        status: 'pending',
        createdAt: '05:42:19',
        triggerMessageId: 'msg_001_3',
      },
    ],
  },
  {
    id: 's_user_002',
    customerName: '林晓萍',
    phoneOrEmail: 'linxp_2026@outlook.com',
    scenario: '售后退款咨询',
    avatarSeed: 34,
    channel: 'link',
    status: 'auto',
    isTransferred: false,
    inCaseLibrary: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-06-11 05:52',
    messages: [
      {
        id: 'msg_002_1',
        sender: 'customer',
        name: '林晓萍',
        content: '你好，我今天发起了一笔退货退款，之前是 299 元买的，优惠券抵扣了 20 元，为什么现在只显示退给我 259 元？中间少了 20 元你们是怎么折旧计算的？帮我核对一下。',
        timestamp: '05:52:10'
      },
      {
        id: 'msg_002_2',
        sender: 'ai',
        name: '产品销售服务官',
        content: '收到林女士的退款账目疑问！请稍后，我正在调取您的本笔订单明细，并交由 [多场景退换货极速计算器] 自动解析实退金额。',
        timestamp: '05:52:50'
      }
    ],
    thoughtTrace: [
      {
        id: 'tt_2_1',
        time: '05:52:50',
        type: 'info',
        message: '外部客户 林晓萍 进线，需理解优惠券抵扣与折旧规则后再回复退款金额。',
        triggerMessageId: 'msg_002_1',
      },
      {
        id: 'tt_2_2',
        time: '05:52:51',
        type: 'search',
        message: '检索员工知识：食安险常见问题解答 (FAQ)',
        resourceKind: 'kb',
        resourceName: '食安险常见问题解答 (FAQ)',
        triggerMessageId: 'msg_002_1',
      },
      {
        id: 'tt_2_2b',
        time: '05:52:51',
        type: 'search',
        message: '索引订单明细',
        resourceKind: 'doc',
        resourceName: '订单明细 #88291',
        triggerMessageId: 'msg_002_1',
      },
      {
        id: 'tt_2_3',
        time: '05:52:52',
        type: 'tool',
        message: '调用理赔测算技能',
        resourceKind: 'skill',
        resourceName: '食安险快速理赔测算器',
        triggerMessageId: 'msg_002_1',
      },
      {
        id: 'tt_2_4',
        time: '05:52:53',
        type: 'decision',
        message: '核算无误：299 - 20(券) - 20(折旧) = 259 元，可据此组织回复说明。',
        triggerMessageId: 'msg_002_1',
      },
      {
        id: 'tt_2_5',
        time: '05:52:55',
        type: 'output',
        message: '组织通俗说明并发送回复',
        triggerMessageId: 'msg_002_1',
      }
    ],
    todos: [],
  },
  {
    id: 's_user_003',
    customerName: '张建树',
    phoneOrEmail: 'zjsh_vip@vip.com',
    scenario: '大客户尊享活动规则咨询',
    avatarSeed: 4,
    channel: 'web',
    status: 'manual',
    isTransferred: true,
    inCaseLibrary: true,
    caseLibraryRemark: '大客户尊享折扣与网关申请规则咨询，可作为会员权益答疑样例。',
    assignedAgentId: 'h_sales',
    assignedStaffId: 'hs_001',
    createdAt: '2026-06-11 05:25',
    messages: [
      {
        id: 'msg_003_1',
        sender: 'customer',
        name: '张建树',
        content: '我是你们的黑金会员卡（ID: VIP9928），我想问问今年续交 5 年服务期，是不是可以享受原尊享 6.8 折优惠，另外可以单独申请几台物理网关？',
        timestamp: '05:25:01'
      },
      {
        id: 'msg_003_2',
        sender: 'ai',
        name: '产品销售服务官',
        content: '张先生您好，您作为我们尊贵的黑金级客户，续交五年属于超大金额订单。我已经调取了《核心 VIP 专享奢华服务标准与积分折扣条款》作为参考，黑金续五年不仅享受 6.8 折，更有单独派发多台物理网关的特殊商务名额。此类高额商务定制涉及物理寄送，我推荐为您接线官方超级管理员 (TAOs) 为您一对一特殊配额审核。您看可以吗？',
        timestamp: '05:26:10'
      },
      {
        id: 'msg_003_3',
        sender: 'customer',
        name: '张建树',
        content: '行，你帮我切给懂商业条款的管理员吧，我正好要把合同打出来。',
        timestamp: '05:27:00'
      },
      {
        id: 'msg_003_4',
        sender: 'system',
        name: '系统转接',
        content: '数字员工触发特殊授权通道，已为您转接至值班同事 [TAOs (当前登录)]。',
        timestamp: '05:27:05'
      },
      {
        id: 'msg_003_5',
        sender: 'human',
        name: 'TAOs',
        content: '张总您好！由我特别接待您的五年续办。物理网关这边我专门向研发中心为您申请了最高可得 3 台全新 JoyServing 智能物理大网关，顺丰空运保价邮寄给您。合同一封电子版我会待会同步在此处，请问这个方案满意吗？',
        timestamp: '05:28:15'
      },
      {
        id: 'msg_003_6',
        sender: 'customer',
        name: '张建树',
        content: '可以，非常满意，比普通客服直接拒绝要强。把电子合同链接扔给我就行！',
        timestamp: '05:29:40'
      }
    ],
    thoughtTrace: [
      {
        id: 'tt_3_1',
        time: '05:25:01',
        type: 'info',
        message: '外部客户 张建树（VIP9928）进线，识别 VIP 续费折扣与物理网关定制诉求。',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'tt_3_2',
        time: '05:25:05',
        type: 'search',
        message: '检索 VIP 条款',
        resourceKind: 'kb',
        resourceName: '餐饮商户加保与费率优惠条款',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'tt_3_2b',
        time: '05:25:06',
        type: 'search',
        message: '索引 VIP 服务标准文档',
        resourceKind: 'doc',
        resourceName: '核心 VIP 专享服务标准',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'tt_3_3',
        time: '05:25:10',
        type: 'tool',
        message: '同步 CRM',
        resourceKind: 'skill',
        resourceName: '餐饮商户 CRM 保单信息同步',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'tt_3_4',
        time: '05:25:10',
        type: 'decision',
        message: '高价值客户需商务确认配额与合同，数字员工无法代签，转入待办由同事跟进。',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'tt_3_5',
        time: '05:27:05',
        type: 'tool',
        message: '生成待办',
        resourceKind: 'tool',
        resourceName: '待办工单',
        resourceTag: 'VIP',
        triggerMessageId: 'msg_003_3',
      },
      {
        id: 'tt_3_6',
        time: '05:27:05',
        type: 'output',
        message: '说明已登记商务跟进待办，并同步客户期望',
        triggerMessageId: 'msg_003_3',
      }
    ],
    todos: [
      {
        id: 'todo_003_1',
        title: 'VIP 五年续费折扣方案确认',
        detail: '需商务确认 6.8 折及网关配额',
        priority: 'normal',
        status: 'pending',
        createdAt: '05:25:10',
        triggerMessageId: 'msg_003_1',
      },
      {
        id: 'todo_003_2',
        title: '安排管理员对接合同盖章',
        detail: '客户要求线下合同，AI 无法代签',
        priority: 'high',
        status: 'pending',
        createdAt: '05:27:05',
        triggerMessageId: 'msg_003_3',
      },
    ],
  },
  {
    id: 's_user_004',
    customerName: '陈婉清',
    phoneOrEmail: '138****6612',
    scenario: '理赔材料清单咨询',
    avatarSeed: 21,
    channel: 'chat',
    status: 'auto',
    isTransferred: false,
    inCaseLibrary: false,
    assignedAgentId: 'h_food_safety',
    createdAt: '2026-06-11 06:08',
    messages: [
      {
        id: 'msg_004_1',
        sender: 'customer',
        name: '陈婉清',
        content: '我们店昨天有客人吃完拉肚子，想走食安责任险理赔，需要准备哪些材料？医院发票能不能电子版？',
        timestamp: '06:08:22',
      },
    ],
    thoughtTrace: [
      {
        id: 'tt_4_1',
        time: '06:08:23',
        type: 'info',
        message: '识别理赔材料清单诉求，需核对就医票据规范。',
        triggerMessageId: 'msg_004_1',
      },
      {
        id: 'tt_4_2',
        time: '06:08:24',
        type: 'search',
        message: '检索理赔材料',
        resourceKind: 'kb',
        resourceName: '食安险理赔流程与材料清单',
        triggerMessageId: 'msg_004_1',
      },
      {
        id: 'tt_4_3',
        time: '06:08:25',
        type: 'search',
        message: '检索票据规范',
        resourceKind: 'doc',
        resourceName: '急性肠胃炎就医与票据规范',
        triggerMessageId: 'msg_004_1',
      },
      {
        id: 'tt_4_4',
        time: '06:08:26',
        type: 'decision',
        message: '材料齐备可电子发票，补充诊断证明与消费小票后可引导线上报案。',
        triggerMessageId: 'msg_004_1',
      },
    ],
    todos: [],
  },
  {
    id: 's_user_005',
    customerName: '赵明远',
    phoneOrEmail: 'zmy_cafe@qq.com',
    scenario: '加保与费率咨询',
    avatarSeed: 48,
    channel: 'web',
    status: 'auto',
    isTransferred: false,
    inCaseLibrary: false,
    assignedAgentId: 'h_sales',
    createdAt: '2026-06-11 06:11',
    messages: [
      {
        id: 'msg_005_1',
        sender: 'customer',
        name: '赵明远',
        content: '我们连锁开到 6 家了，想把保额从 100 万加到 300 万，大概费率怎么算？有没有团餐优惠？',
        timestamp: '06:11:05',
      },
      {
        id: 'msg_005_2',
        sender: 'ai',
        name: '食安险商户顾问',
        content: '赵总您好，6 家门店加保可按连锁业态合并评估。我已按《加保与费率优惠条款》测算：保额升至 300 万后年保费约上浮 38%，团餐门店另可申请 5% 渠道优惠。需要我帮您生成报价单吗？',
        timestamp: '06:11:48',
      },
    ],
    thoughtTrace: [
      {
        id: 'tt_5_1',
        time: '06:11:06',
        type: 'info',
        message: '连锁加保诉求，需结合门店数与业态测算费率。',
        triggerMessageId: 'msg_005_1',
      },
      {
        id: 'tt_5_2',
        time: '06:11:07',
        type: 'search',
        message: '检索费率条款',
        resourceKind: 'kb',
        resourceName: '餐饮商户加保与费率优惠条款',
        triggerMessageId: 'msg_005_1',
      },
      {
        id: 'tt_5_3',
        time: '06:11:08',
        type: 'tool',
        message: '调用测算技能',
        resourceKind: 'skill',
        resourceName: '食安险快速理赔测算器',
        triggerMessageId: 'msg_005_1',
      },
      {
        id: 'tt_5_4',
        time: '06:11:10',
        type: 'decision',
        message: '测算完成：保额 300 万年保费约上浮 38%，可附团餐 5% 优惠说明回复。',
        triggerMessageId: 'msg_005_1',
      },
      {
        id: 'tt_5_5',
        time: '06:11:48',
        type: 'output',
        message: '发送加保报价说明',
        triggerMessageId: 'msg_005_1',
      },
    ],
    todos: [],
  },
  {
    id: 's_user_006',
    customerName: '周婷',
    phoneOrEmail: '企微用户·周婷',
    scenario: '活动规则与发货咨询',
    avatarSeed: 63,
    channel: 'chat',
    status: 'auto',
    isTransferred: false,
    inCaseLibrary: false,
    assignedAgentId: 'h_wechat',
    createdAt: '2026-06-11 06:12',
    messages: [
      {
        id: 'msg_006_1',
        sender: 'customer',
        name: '周婷',
        content: '双十一预售定金膨胀券怎么用？我付了定金但尾款页面没有显示膨胀额度。',
        timestamp: '06:12:18',
      },
    ],
    thoughtTrace: [
      {
        id: 'tt_6_1',
        time: '06:12:19',
        type: 'info',
        message: '企微用户咨询定金膨胀券展示异常。',
        triggerMessageId: 'msg_006_1',
      },
      {
        id: 'tt_6_2',
        time: '06:12:20',
        type: 'search',
        message: '检索 FAQ',
        resourceKind: 'kb',
        resourceName: '食安险常见问题解答 (FAQ)',
        triggerMessageId: 'msg_006_1',
      },
      {
        id: 'tt_6_3',
        time: '06:12:21',
        type: 'tool',
        message: '情绪监测',
        resourceKind: 'component',
        resourceName: 'NLP 情绪感知组件',
        resourceTag: '轻度焦虑',
        triggerMessageId: 'msg_006_1',
      },
      {
        id: 'tt_6_4',
        time: '06:12:22',
        type: 'decision',
        message: '引导核对膨胀券生效时段与商品类目；若仍无额度可走订单核验待办。',
        triggerMessageId: 'msg_006_1',
      },
    ],
    todos: [
      {
        id: 'todo_006_1',
        title: '核验定金膨胀券未展示',
        detail: '用户尾款页无膨胀额度，需订单侧核对',
        priority: 'normal',
        status: 'pending',
        createdAt: '06:12:22',
        triggerMessageId: 'msg_006_1',
      },
    ],
  },
  {
    id: 's_user_007',
    customerName: '吴磊',
    phoneOrEmail: '139****2044',
    scenario: '拒保情形咨询',
    avatarSeed: 8,
    channel: 'link',
    status: 'auto',
    isTransferred: false,
    inCaseLibrary: false,
    assignedAgentId: 'h_food_safety',
    createdAt: '2026-06-11 06:14',
    messages: [
      {
        id: 'msg_007_1',
        sender: 'customer',
        name: '吴磊',
        content: '我们是中央厨房给学校供餐的，上次核保被拒了，说风险太高。有没有办法重新投保？',
        timestamp: '06:14:02',
      },
      {
        id: 'msg_007_2',
        sender: 'ai',
        name: '食安险客服专员',
        content: '吴先生您好，中央厨房服务学校属高关注业态。按核保规则，需补充《供餐卫生管理记录》与近 12 个月抽检报告后可复议。我已为您标记复议待办，材料齐后可再次提交。',
        timestamp: '06:14:40',
      },
    ],
    thoughtTrace: [
      {
        id: 'tt_7_1',
        time: '06:14:03',
        type: 'info',
        message: '中央厨房拒保复议诉求，需核对核保与专项条款。',
        triggerMessageId: 'msg_007_1',
      },
      {
        id: 'tt_7_2',
        time: '06:14:04',
        type: 'search',
        message: '检索拒保情形',
        resourceKind: 'kb',
        resourceName: '食安险核保规则与拒保情形',
        triggerMessageId: 'msg_007_1',
      },
      {
        id: 'tt_7_3',
        time: '06:14:05',
        type: 'search',
        message: '检索团餐专项',
        resourceKind: 'doc',
        resourceName: '团餐与中央厨房专项条款',
        triggerMessageId: 'msg_007_1',
      },
      {
        id: 'tt_7_4',
        time: '06:14:06',
        type: 'decision',
        message: '可复议：补充卫生管理记录与抽检报告后重新核保。',
        triggerMessageId: 'msg_007_1',
      },
      {
        id: 'tt_7_5',
        time: '06:14:40',
        type: 'output',
        message: '发送复议材料说明',
        triggerMessageId: 'msg_007_1',
      },
    ],
    todos: [
      {
        id: 'todo_007_1',
        title: '跟进中央厨房复议材料',
        detail: '待客户提交卫生管理记录与抽检报告',
        priority: 'normal',
        status: 'pending',
        createdAt: '06:14:40',
        triggerMessageId: 'msg_007_1',
      },
    ],
  },
];
