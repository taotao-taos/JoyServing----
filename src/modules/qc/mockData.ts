import { DataSource, QualityTemplate, QualityCampaign, AuditTask, CoachingTask } from "./types";

export const initialDataSources: DataSource[] = [
  {
    id: "src-manual-voice",
    name: "人工语音会话",
    type: "manual_voice",
    status: "active",
    syncFrequency: "实时同步",
    totalRecords: 14205,
    lastSyncTime: "1分钟前",
    config: {
      apiUrl: "https://api.yourcompany.com",
      authType: "OAuth2 / SecToken",
      rateLimit: "1000 req/min"
    }
  },
  {
    id: "src-manual-chat",
    name: "人工在线会话",
    type: "manual_chat",
    status: "active",
    syncFrequency: "实时同步",
    totalRecords: 8930,
    lastSyncTime: "12分钟前",
    config: {
      apiUrl: "https://api.yourcompany.com",
      authType: "OAuth2 / SecToken",
      rateLimit: "1200 req/min"
    }
  },
  {
    id: "src-digital-chat",
    name: "数字员工在线会话",
    type: "digital_chat",
    status: "active",
    syncFrequency: "实时同步",
    totalRecords: 24090,
    lastSyncTime: "45分钟前",
    config: {
      apiUrl: "https://api.yourcompany.com",
      authType: "OAuth2 / SecToken",
      rateLimit: "1500 req/min"
    }
  },
  {
    id: "src-digital-voice",
    name: "数字员工语音会话",
    type: "digital_voice",
    status: "active",
    syncFrequency: "每 15 分钟",
    totalRecords: 4850,
    lastSyncTime: "15分钟前",
    config: {
      apiUrl: "https://api.yourcompany.com",
      authType: "OAuth2 / SecToken",
      rateLimit: "500 req/min"
    }
  },
  {
    id: "src-unified-chat",
    name: "在线融合工作台会话",
    type: "unified_chat",
    status: "active",
    syncFrequency: "实时同步",
    totalRecords: 31200,
    lastSyncTime: "2小时前",
    config: {
      apiUrl: "https://api.yourcompany.com",
      authType: "OAuth2 / SecToken",
      rateLimit: "2000 req/min"
    }
  }
];

export const initialTemplates: QualityTemplate[] = [
  {
    id: "tmpl-wealth",
    name: "高端理财与基金投资合规模板",
    creator: "质检主管张丽",
    updateTime: "2026-06-25 14:30",
    description: "专用于高端理财、公募及私募证券咨询。严格核验产品适当性匹配、投资限额警示、质押比例以及禁止承诺保本收益红线。",
    isActive: true,
    weights: {
      greeting: 10,
      compliance: 40,
      accuracy: 50,
      timeoutPenalty: -10,
      bannedPenalty: -20
    },
    bannedWords: ["保证保本", "稳赚不赔", "闭眼买", "自己看着办", "随便你投诉", "不知道"],
    requiredKeywords: ["投资有风险", "适当性评估", "产品细则"]
  },
  {
    id: "tmpl-insurance",
    name: "健康险售前咨询红线检测规范",
    creator: "合规组刘强",
    updateTime: "2026-07-01 09:15",
    description: "针对百万医疗险、重疾险等线上咨询。强化如实告知提示、免赔额解析以及理赔周期合规答复核查。",
    isActive: true,
    weights: {
      greeting: 15,
      compliance: 35,
      accuracy: 50,
      timeoutPenalty: -5,
      bannedPenalty: -15
    },
    bannedWords: ["肯定能赔", "不用健康告知", "随便报销", "退不了", "怎么没人理我"],
    requiredKeywords: ["如实告知义务", "免赔额设定", "等待期规定"]
  },
  {
    id: "tmpl-credit",
    name: "信用卡及分期业务规范模板",
    creator: "系统默认",
    updateTime: "2026-05-12 11:00",
    description: "核算信用卡额度提升、账单分期利息披露等标准话术。严控未披露年费政策、暴力索款及敷衍态度。",
    isActive: true,
    weights: {
      greeting: 10,
      compliance: 40,
      accuracy: 50,
      timeoutPenalty: -10,
      bannedPenalty: -20
    },
    bannedWords: ["没法查", "系统就这样", "不刷够就扣钱", "不管我的事"],
    requiredKeywords: ["年费减免政策", "分期手续费率", "官方申请渠道"]
  },
  {
    id: "tmpl-default",
    name: "通用标准客户服务话术规范",
    creator: "系统默认",
    updateTime: "2026-04-10 16:45",
    description: "基础通用客服服务态度与规范质检，适用于全渠道未匹配特定品类的会话流水。",
    isActive: false,
    weights: {
      greeting: 20,
      compliance: 40,
      accuracy: 40,
      timeoutPenalty: -5,
      bannedPenalty: -10
    },
    bannedWords: ["傻逼", "有病", "自己解决", "不处理", "不知道"],
    requiredKeywords: ["您好", "请问有什么可以帮您", "祝您生活愉快"]
  }
];

export const initialCampaigns: QualityCampaign[] = [
  {
    id: "cmp-1",
    name: "2026 Q3 高端理财合规合规专项抽检",
    status: "running",
    dataSourceId: "src-wechat",
    templateId: "tmpl-wealth",
    scope: "理财组 10% 随机抽样",
    progress: 68,
    totalVolume: 1200,
    inspectedVolume: 816,
    warningCount: 42,
    averageScore: 91.5,
    createdAt: "2026-07-01"
  },
  {
    id: "cmp-2",
    name: "每日健康险 AI 引擎全量筛查批次",
    status: "running",
    dataSourceId: "src-feishu",
    templateId: "tmpl-insurance",
    scope: "健康险咨询 今日全量",
    progress: 92,
    totalVolume: 3500,
    inspectedVolume: 3220,
    warningCount: 15,
    averageScore: 94.8,
    createdAt: "2026-07-09"
  },
  {
    id: "cmp-3",
    name: "呼叫中心高风险语音离线转译全检",
    status: "running",
    dataSourceId: "src-voice",
    templateId: "tmpl-wealth",
    scope: "近一周语音 包含敏感投诉字眼",
    progress: 45,
    totalVolume: 500,
    inspectedVolume: 225,
    warningCount: 28,
    averageScore: 84.2,
    createdAt: "2026-07-05"
  },
  {
    id: "cmp-4",
    name: "信用卡逾期费争议专项复查活动",
    status: "paused",
    dataSourceId: "src-dingtalk",
    templateId: "tmpl-credit",
    scope: "信用卡组 逾期利息咨询 50% 抽检",
    progress: 100,
    totalVolume: 800,
    inspectedVolume: 800,
    warningCount: 74,
    averageScore: 81.0,
    createdAt: "2026-06-20"
  },
  {
    id: "cmp-5",
    name: "智能客服分流引导率与误答核验",
    status: "completed",
    dataSourceId: "src-wechat",
    templateId: "tmpl-default",
    scope: "智能分流全量筛查",
    progress: 100,
    totalVolume: 5000,
    inspectedVolume: 5000,
    warningCount: 8,
    averageScore: 97.6,
    createdAt: "2026-06-15"
  }
];

export const initialAuditTasks: AuditTask[] = [
  {
    id: "task-1",
    campaignId: "cmp-1",
    sessionID: "#REQ-89020",
    agentName: "薛程月",
    agentId: "agent-001",
    group: "高端理财组",
    time: "45 分钟前",
    sentiment: "negative",
    status: "warning",
    aiScore: 72,
    sessionType: 'human',
    intentCategory: '资金未入账及赎回进度咨询',
    tags: ['主动催办', '专业解答'],
    reviewComment: "触发响应超时处罚 (扣10分)。客服平均响应间隔3分钟以上，导致客户催问。服务态度良好，无禁忌词。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 32,
      accuracy: 40,
      timeoutPenalty: -10,
      bannedPenalty: 0
    },
    transcript: [
      { role: "user", text: "你好，我今天下午申请的理财赎回，怎么资金现在还没入账啊？显示在处理中。", time: "14:20:10" },
      { role: "user", text: "有人吗？？？着急用钱，麻烦看下。", time: "14:23:45" },
      { role: "user", text: "怎么没人理我啊？你们这服务效率太让人失望了。", time: "14:26:12" },
      { role: "agent", text: "您好！非常抱歉让您久等了。今天由于系统清算量巨大，赎回申请正在加急排队中，预计 2 小时内会到账。我这边已经为您提交了后台催办，请您耐心等待。", time: "14:28:30" },
      { role: "user", text: "行吧，那我就再等等。下次响应能不能稍微快点？", time: "14:29:15" },
      { role: "agent", text: "实在对不起。后续我们会加强系统排班，给您带来不便敬请谅解。祝您生活愉快！", time: "14:30:02" }
    ]
  },
  {
    id: "task-2",
    campaignId: "cmp-2",
    sessionID: "#REQ-89021",
    agentName: "保险智能助手0629",
    agentId: "agent-ai-01",
    group: "AI 员工分流组",
    time: "10 分钟前",
    sentiment: "positive",
    status: "resolved",
    aiScore: 98,
    sessionType: 'digital',
    intentCategory: '医疗险年度免赔额设定标准咨询',
    tags: ['到我为止', '秒级响应', '五星标杆'],
    reviewComment: "AI自动质检结论：符合完美的客服规范。秒级响应，专业分析免赔额，礼貌周到。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 38,
      accuracy: 50,
      timeoutPenalty: 0,
      bannedPenalty: 0
    },
    transcript: [
      { role: "user", text: "你好，我想问一下尊享e生百万医疗险的免赔额是多少？怎么算？", time: "15:10:02" },
      { role: "agent", text: "您好！很高兴为您解答。尊享e生百万医疗险的一般医疗保险金年度免赔额通常为 1 万元。如果是特定重大疾病或一般疾病选择共享免赔额版本，可能会有所不同。请问您看的是哪个版本呢？", time: "15:10:03" },
      { role: "user", text: "就是2026旗舰版，谢谢。很清楚。", time: "15:10:45" },
      { role: "agent", text: "不客气！2026旗舰版除了保额高，还包含质子重离子治疗以及丰富的增值服务。如果您有投保意向，我可以为您发送专属保费测算链接，您可以如实告知相关健康状况。祝您生活愉快！", time: "15:10:47" }
    ]
  },
  {
    id: "task-3",
    campaignId: "cmp-1",
    sessionID: "#REQ-89015",
    agentName: "李明",
    agentId: "agent-002",
    group: "人工客服组",
    time: "2 小时前",
    sentiment: "neutral",
    status: "appealing",
    aiScore: 70,
    sessionType: 'human',
    intentCategory: '退款系统网络延迟及手动操作指引',
    tags: ['中途转人工', '负向言语引导'],
    appealReason: "当时客户情绪十分激动，不接受在线常规退款方式，我是在礼貌引导客户查阅用户自主退款手册，并在其自主决定。我绝无拒绝服务之意，由于客户持续追问才使用这套说辞引导。申请豁免服务红线扣分。",
    appealTime: "2026-07-10 02:45",
    reviewComment: "触发严禁红线：含有疑似服务禁语「你自己看着办」，扣除20分。触发负面情绪倾向。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 35,
      accuracy: 45,
      timeoutPenalty: 0,
      bannedPenalty: -20
    },
    transcript: [
      { role: "user", text: "这个退款通道到底怎么走？我点了没反应啊，别骗我钱！", time: "13:02:15" },
      { role: "agent", text: "您好，您可以尝试清除一下浏览器缓存，或者在个人中心点击退款申请。", time: "13:03:00" },
      { role: "user", text: "试过了还是不行，你不能直接在后台帮我退了吗？怎么这么麻烦！", time: "13:03:45" },
      { role: "agent", text: "抱歉先生，退款涉及资金安全，必须由您账户自主授权。这两种方式您自己看着选择办理都可以，如有困难我可发送带图指引。", time: "13:05:10" }
    ]
  },
  {
    id: "task-4",
    campaignId: "cmp-3",
    sessionID: "#REQ-89033",
    agentName: "张芳",
    agentId: "agent-003",
    group: "高端理财组",
    time: "3 小时前",
    sentiment: "negative",
    status: "warning",
    aiScore: 58,
    reviewComment: "触发严重红线：含有承诺保本等违规话术。AI引擎标注：「投资理财是不可能亏的」严重违反适当性原则。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 18,
      accuracy: 30,
      timeoutPenalty: 0,
      bannedPenalty: -20
    },
    transcript: [
      { role: "user", text: "你们这个固收加产品最近波动怎么这么厉害？会不会本金都亏光啊？", time: "11:20:11" },
      { role: "agent", text: "您好，您放心，我们这个是低风险的固收加理财。我们有很强的投资经理，基本保证保本的，闭眼买都没问题，是不可能亏的。", time: "11:22:30" },
      { role: "user", text: "是吗？那我放心了，那我再追加50万。", time: "11:23:45" },
      { role: "agent", text: "好的呢，这就给您发送申购链接，祝您收益连连！", time: "11:24:30" }
    ]
  },
  {
    id: "task-5",
    campaignId: "cmp-1",
    sessionID: "#REQ-89008",
    agentName: "薛程月",
    agentId: "agent-001",
    group: "高端理财组",
    time: "5 小时前",
    sentiment: "positive",
    status: "resolved",
    aiScore: 92,
    reviewComment: "整体规范解答完备。有效解决理财质押贷款及利息扣除机制问题，服务话术优雅周到。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 36,
      accuracy: 46,
      timeoutPenalty: 0,
      bannedPenalty: 0
    },
    transcript: [
      { role: "user", text: "理财产品能拿来做质押贷款吗？怎么收利息？", time: "10:15:12" },
      { role: "agent", text: "您好，部分特定的理财产品是支持质押贷款的。贷款利率通常在质押理财收益率基础上微调。您可以登录手机银行「贷款-理财质押贷」查看可质押额度。投资有风险，办理前请先阅读适当性评估及产品细则。", time: "10:17:30" }
    ]
  },
  {
    id: "task-6",
    campaignId: "cmp-3",
    sessionID: "#REQ-89045",
    agentName: "林静",
    agentId: "agent-004",
    group: "人工客服组",
    time: "6 小时前",
    sentiment: "negative",
    status: "pending",
    aiScore: 65,
    reviewComment: "待人工审核批次。客户投诉退保违约金问题，坐席有不耐烦词汇，疑似态度生硬。",
    scoreBreakdown: {
      greeting: 8,
      compliance: 28,
      accuracy: 39,
      timeoutPenalty: 0,
      bannedPenalty: -10
    },
    transcript: [
      { role: "user", text: "凭什么我退保要扣40%现金价值？这不就是抢钱吗？我要去保监会告你们！", time: "09:30:15" },
      { role: "agent", text: "女士，您购买的时候合同上写得清清楚楚。如果您要去投诉那也是随便你，我们有完整的告知确认书。退保肯定是要按合同扣钱的。", time: "09:32:00" },
      { role: "user", text: "你这是什么态度？什么叫随便我投诉？工号多少！", time: "09:33:12" },
      { role: "agent", text: "我的工号是 3048，您看完了合同不理解我也没办法。", time: "09:34:00" }
    ]
  },
  {
    id: "task-7",
    campaignId: "cmp-4",
    sessionID: "#REQ-89066",
    agentName: "王伟",
    agentId: "agent-005",
    group: "人工客服组",
    time: "1 天前",
    sentiment: "neutral",
    status: "resolved",
    aiScore: 84,
    reviewComment: "话术规范，按要求介绍了年费政策及退还要求，但缺少了一句主动挽留话术。",
    scoreBreakdown: {
      greeting: 10,
      compliance: 34,
      accuracy: 40,
      timeoutPenalty: 0,
      bannedPenalty: 0
    },
    transcript: [
      { role: "user", text: "你好，我刚发现我信用卡被扣了200元年费，我以前都是免年费的啊？", time: "08:12:05" },
      { role: "agent", text: "您好！由于您上一年没有满足刷卡满6次或者累计消费满3000元的免年费条件，所以产生了年费扣除。根据我们的年费减免政策，只要您在接下来15天内补刷3笔，即可自动退还年费。", time: "08:14:00" },
      { role: "user", text: "好吧，那我赶紧去补刷3笔。谢谢了。", time: "08:15:30" }
    ]
  }
];

export const initialCoachingTasks: CoachingTask[] = [
  {
    id: "coach-1",
    agentName: "张芳",
    agentId: "agent-003",
    group: "高端理财组",
    coachName: "高端理财主管张丽",
    relatedSessionID: "#REQ-89033",
    scoreBefore: 58,
    issueType: "禁语违规",
    status: "to_be_coached",
    assignedTime: "2026-07-09 18:00",
    coachingPlan: "1. 重点纠偏「承诺保本」红线，重温金融消费者权益保护条例。\n2. 罚没该单提成，进行适当性合规案例口头模拟通关演练。\n3. 安排本周合规考试补测。"
  },
  {
    id: "coach-2",
    agentName: "李明",
    agentId: "agent-002",
    group: "人工客服组",
    coachName: "客服部经理周明",
    relatedSessionID: "#REQ-89015",
    scoreBefore: 70,
    issueType: "态度冷漠",
    status: "coaching",
    assignedTime: "2026-07-09 11:30",
    coachingPlan: "1. 针对「你自己看着办」负面话术纠正，演练在愤怒客户追问下的情绪隔离和温柔抚慰技巧。\n2. 要求其录音自我旁听并记录300字复盘心得。",
    agentFeedback: "已收到辅导要求。当时由于连续值班8小时，情绪管理有些松懈，后续会注意合理调整，已完成录音分析和案例总结。"
  },
  {
    id: "coach-3",
    agentName: "薛程月",
    agentId: "agent-001",
    group: "高端理财组",
    coachName: "高端理财主管张丽",
    relatedSessionID: "#REQ-89020",
    scoreBefore: 72,
    issueType: "严重超时",
    status: "completed",
    assignedTime: "2026-07-08 09:00",
    completedTime: "2026-07-09 10:00",
    coachingPlan: "1. 分析多任务排班并发情况。培训如何在使用快捷用语的同时，及时安抚等待中的高净值客户。\n2. 学习系统一键转接机制和催办反馈流程。",
    agentFeedback: "非常有用的辅导。掌握了通过主动排班预告来稳定客户心理预期的技巧，目前我的平均响应时间已缩短至75秒左右。"
  }
];
