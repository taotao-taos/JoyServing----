import type { TraceScenario } from './TraceNodeCard';

/* ── 智能轨迹场景数据（复刻自「会话链路轨迹分析器」食安险理赔场景） ── */
export const FOOD_INSURANCE_TRACE: TraceScenario = {
  id: 'sc-food-insurance',
  title: '食安险理赔咨询',
  description: '用户咨询食品安全责任险理赔流程，智能体完成问题改写、知识库检索、工具调用与回复生成。',
  metrics: {
    messageid: 'msg-20260716-8f3a2c',
    status: 'success',
    totalCostMs: 2947,
    firstPacketMs: 799,
    totalTokens: 3862,
    inputTokens: 3120,
    outputTokens: 742,
  },
  nodes: [
    {
      id: 'node-f1',
      name: '用户输入',
      type: 'input',
      message: '我在你们平台买的食品安全责任险，现在发生了食物中毒理赔，应该怎么走流程？需要准备哪些材料？',
      prependContent: '{"channel":"online_chat","userId":"u_88213","sessionId":"sess-441029","locale":"zh-CN"}',
    },
    {
      id: 'node-f2',
      name: '智能体循环开始',
      type: 'lifecycle-start',
      ts: '2026-07-16 14:32:07.114',
    },
    {
      id: 'node-f3',
      name: 'RAG 问题改写',
      type: 'rewrite-rag-query',
      costMs: 312,
      question: '我在你们平台买的食品安全责任险，现在发生了食物中毒理赔，应该怎么走流程？需要准备哪些材料？',
      input: '历史轮次：无\n当前问题：食品安全责任险食物中毒理赔流程与材料',
      rewrittenQuestion: '食品安全责任险 食物中毒 理赔流程 所需材料 报案 定损 赔付',
      systemPrompt: '你是检索问题改写助手。请将用户口语化问题改写为适合向量检索的关键词组合，保留核心实体与意图，去除冗余寒暄。',
      model: 'Qwen3.6-35B-A3B',
      usage: { input: 186, output: 42, totalTokens: 228 },
    },
    {
      id: 'node-f4',
      name: '知识库检索',
      type: 'rag',
      costMs: 486,
      ragChunks: [
        {
          document_keyword: '食品安全责任险理赔指引_V3.2.pdf',
          content: '食物中毒类理赔适用条款第4.2条。被保险人应在事故发生后48小时内向保险公司报案，提供：①医院诊断证明/病历；②消费凭证（发票/小票）；③食品样本或购买记录；④疾控中心出具的中毒鉴定报告（如有）。',
          similarity: 0.91284471,
        },
        {
          document_keyword: '理赔材料清单_通用.docx',
          content: '标准理赔材料：被保险人身份证明、保单号、事故经过说明、损失金额证明、银行账户信息。涉及人身伤害的需附医疗费用发票原件。',
          similarity: 0.87651203,
        },
      ],
    },
    {
      id: 'node-f5',
      name: '大模型推理调用',
      type: 'model-call',
      costMs: 1104,
      model: 'Qwen3.6-35B-A3B',
      messages: [
        { role: 'system', name: 'system', text: '你是专业的保险理赔客服，请依据知识库内容准确回答用户，不得编造条款。' },
        { role: 'customer', name: '用户', text: '食品安全责任险食物中毒理赔流程与材料' },
      ],
      systemPrompt: '基于检索到的知识片段，生成结构化理赔指引。要求：分步骤说明，材料清单以列表呈现，提醒时效要求。',
      text: '用户问的是食物中毒理赔。命中知识库第4.2条，需强调48小时报案时效，并列出四类核心材料。同时调用理赔时效查询工具确认当前保单状态。',
      toolInfo: {
        name: 'query_claim_policy_status',
        id: 'call_a1b2c3',
        arguments: '{"policyNo":"FSI-2026-88213","claimType":"food_poisoning"}',
      },
      content: '',
      usage: { input: 2640, output: 318, totalTokens: 2958 },
    },
    {
      id: 'node-f6',
      name: '工具调用：保单状态查询',
      type: 'tool',
      costMs: 268,
      toolName: 'query_claim_policy_status',
      command: 'query_claim_policy_status --policy FSI-2026-88213 --type food_poisoning',
      exitCode: 0,
      resultContentTable: [
        { key: '保单状态', value: '生效中' },
        { key: '保额剩余', value: '¥ 480,000' },
        { key: '本年已赔付', value: '¥ 0' },
        { key: '报案时效', value: '事故后 48 小时内' },
      ],
    },
    {
      id: 'node-f7',
      name: '回复净化',
      type: 'reply-sanitizer',
      costMs: 176,
      input: '亲亲~ 您好呀！关于食物中毒理赔呢，您需要在48小时内报案哦，材料方面要准备诊断证明、消费凭证、食品样本、中毒鉴定报告这些啦~',
      systemPrompt: '移除口语化语气词与营销话术，保持专业客观表述，不改变事实信息。',
      finalReply: '您好，关于食品安全责任险的食物中毒理赔，流程如下：\n1. 报案：请在事故发生后 48 小时内报案；\n2. 材料准备：①医院诊断证明/病历；②消费凭证（发票/小票）；③食品样本或购买记录；④疾控中心中毒鉴定报告（如有）；\n3. 定损与赔付：材料齐全后由理赔专员核定。\n您当前保单状态为「生效中」，保额剩余 48 万元。',
      removed: 18,
      model: 'Qwen3.6-35B-A3B',
      usage: { input: 168, output: 220, totalTokens: 388 },
    },
    {
      id: 'node-f8',
      name: '智能体循环结束',
      type: 'lifecycle-end',
      endedAt: '2026-07-16 14:32:10.061',
    },
    {
      id: 'node-f9',
      name: '最终输出',
      type: 'output',
      finalReply: '您好，关于食品安全责任险的食物中毒理赔，流程如下：\n1. 报案：请在事故发生后 48 小时内报案；\n2. 材料准备：①医院诊断证明/病历；②消费凭证（发票/小票）；③食品样本或购买记录；④疾控中心中毒鉴定报告（如有）；\n3. 定损与赔付：材料齐全后由理赔专员核定。\n您当前保单状态为「生效中」，保额剩余 48 万元。',
      stopReason: 'stop',
    },
  ],
};

/* 演示错误态：饭卡余额异常（工具调用失败，红框脉冲） */
export const CARD_ERROR_TRACE: TraceScenario = {
  id: 'sc-card-error',
  title: '饭卡余额异常',
  description: '用户查询饭卡余额，后端服务返回 500 导致工具调用失败。',
  metrics: {
    messageid: 'msg-20260716-e5c1d0',
    status: 'failed',
    totalCostMs: 1683,
    firstPacketMs: 640,
    totalTokens: 1204,
    inputTokens: 980,
    outputTokens: 224,
  },
  nodes: [
  {
      id: 'node-c1',
      name: '用户输入',
      type: 'input',
      message: '我的饭卡余额怎么显示是负数？帮我查一下。',
    },
    {
      id: 'node-c2',
      name: '智能体循环开始',
      type: 'lifecycle-start',
      ts: '2026-07-16 09:12:33.402',
    },
    {
      id: 'node-c3',
      name: '工具调用：余额查询',
      type: 'tool',
      costMs: 502,
      isError: true,
      exitCode: 500,
      toolName: 'query_meal_card_balance',
      command: 'query_meal_card_balance --cardNo MC-77219',
      content: 'HTTP 500 Internal Server Error: balance service timeout after 3000ms',
      resultContentTable: [
        { key: 'HTTP 状态', value: '500' },
        { key: '错误信息', value: 'balance service timeout' },
      ],
    },
    {
      id: 'node-c4',
      name: '最终输出',
      type: 'output',
      finalReply: '抱歉，当前余额查询服务暂时不可用，请稍后再试或联系人工客服。',
      stopReason: 'tool_error',
    },
  ],
};

export const TRACE_SCENARIOS: TraceScenario[] = [FOOD_INSURANCE_TRACE, CARD_ERROR_TRACE];