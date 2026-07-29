/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检标准 = 用户自配的指标树（对齐 QC WorkflowEditor「质检模板配置」下钻）
 * 不是固定 QualityTemplate 列表。
 */

import type {
  QcAnalysisConfig,
  QcAnalysisMappingRow,
  QcLlmDimension,
  QcOperatorType,
  QcStandardCategory,
  QcStandardItem,
  QcStandardTree,
} from '@/src/types';

export type { QcStandardCategory, QcStandardItem, QcStandardTree };

export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyStandardTree(): QcStandardTree {
  return { categories: [] };
}

/** 培训示例种子（可整棵删改，仅作起点，不是「选模板」） */
export function createExampleStandardTree(): QcStandardTree {
  return createComplianceStarterTree();
}

/** 入职培训冷启动模板 */
export function createComplianceStarterTree(): QcStandardTree {
  return {
    categories: [
      {
        id: newId('cat'),
        title: '合规风险',
        indicatorType: '质检类',
        children: [
          {
            id: newId('item'),
            name: '过度承诺判定',
            score: '-15',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'session',
            prompt: QC_PROMPT_PRESETS[2]?.prompt ?? '',
          },
          {
            id: newId('item'),
            name: '承诺保本口径核准',
            score: '-10',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'session',
            prompt:
              '判断客服是否在理财推荐时做了保本保收益口头承诺。命中违规输出「违规」，否则输出「未命中」。',
          },
        ],
      },
    ],
  };
}

export function createEtiquetteStarterTree(): QcStandardTree {
  return {
    categories: [
      {
        id: newId('cat'),
        title: '服务规范',
        indicatorType: '质检类',
        children: [
          {
            id: newId('item'),
            name: '禁语辱骂检测',
            score: '-20',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'message_single',
            prompt: QC_PROMPT_PRESETS[1]?.prompt ?? '',
          },
          {
            id: newId('item'),
            name: '问题是否解决',
            score: '-10',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'session',
            prompt: QC_PROMPT_PRESETS[3]?.prompt ?? '',
          },
        ],
      },
    ],
  };
}

export function createProcessStarterTree(): QcStandardTree {
  return {
    categories: [
      {
        id: newId('cat'),
        title: '流程规范',
        indicatorType: '质检类',
        children: [
          {
            id: newId('item'),
            name: '身份核验',
            score: '-5',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'session',
            prompt:
              '判断客服在涉及账户/资金操作前是否完成必要的身份核验话术。未核验输出「违规」，已核验输出「未命中」。',
          },
          {
            id: newId('item'),
            name: '通用合规质检',
            score: '-10',
            operatorType: '大模型质检',
            selectedModel: 'qwen-max',
            llmDimension: 'session',
            prompt: QC_PROMPT_PRESETS[0]?.prompt ?? '',
          },
        ],
      },
    ],
  };
}

export function createStandardCategory(
  indicatorType: QcStandardCategory['indicatorType'] = '质检类',
): QcStandardCategory {
  const base: QcStandardCategory = {
    id: newId('cat'),
    title: '',
    indicatorType,
    children: [],
  };
  if (indicatorType === '分类标签') {
    base.title = '分类标签分析';
    base.analysisConfig = createDefaultLabelAnalysisConfig();
  } else if (indicatorType === '多维度评分类') {
    base.title = '多维度评分';
    base.analysisConfig = createDefaultMultiAnalysisConfig();
  }
  return base;
}

export function createStandardItem(): QcStandardItem {
  return {
    id: newId('item'),
    name: '',
    score: '-10',
    operatorType: '大模型质检',
    selectedModel: 'qwen-max',
    llmDimension: 'session',
    prompt: '',
  };
}

/** 二级项是否配齐会话质检所需字段（对齐培训右侧配置） */
export function isQcStandardItemComplete(item: QcStandardItem): boolean {
  if (!item.name.trim()) return false;
  if (!String(item.score ?? '').trim()) return false;
  if (!item.operatorType) return false;
  if (item.operatorType === '大模型质检') {
    return Boolean(
      item.selectedModel?.trim() &&
        item.llmDimension &&
        item.prompt?.trim(),
    );
  }
  return false;
}

export function listQcStandardItems(tree?: QcStandardTree | null): {
  item: QcStandardItem;
  categoryTitle: string;
  categoryId: string;
}[] {
  if (!tree?.categories?.length) return [];
  const out: {
    item: QcStandardItem;
    categoryTitle: string;
    categoryId: string;
  }[] = [];
  for (const cat of tree.categories) {
    if (cat.indicatorType !== '质检类') continue;
    for (const item of cat.children) {
      out.push({
        item,
        categoryTitle: cat.title || '未命名一级项',
        categoryId: cat.id,
      });
    }
  }
  return out;
}

/** 至少 1 个已配齐字段的二级项，才算标准可用 */
export function isQcStandardConfigured(tree?: QcStandardTree | null): boolean {
  return listQcStandardItems(tree).some(({ item }) => isQcStandardItemComplete(item));
}

/** 培训能力测试闸门：所有质检类二级项均已配齐 */
export function areAllQcStandardItemsComplete(tree?: QcStandardTree | null): boolean {
  const items = listQcStandardItems(tree);
  if (items.length === 0) return false;
  return items.every(({ item }) => isQcStandardItemComplete(item));
}

export function countStandardItems(tree?: QcStandardTree | null): {
  categories: number;
  items: number;
  completeItems: number;
} {
  const listed = listQcStandardItems(tree);
  const categories =
    tree?.categories?.filter((c) => c.indicatorType === '质检类').length ?? 0;
  return {
    categories,
    items: listed.length,
    completeItems: listed.filter(({ item }) => isQcStandardItemComplete(item)).length,
  };
}

export const QC_LLM_MODELS = [
  { value: 'qwen-max', label: 'Qwen-Max (阿里云)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gpt-4o', label: 'GPT-4o' },
] as const;

export const QC_LLM_DIMENSIONS: { value: QcLlmDimension; label: string }[] = [
  { value: 'session', label: '会话维度' },
  { value: 'message_single', label: '消息维度（单消息）' },
  { value: 'message_context', label: '消息维度（包含上文）' },
];

export const QC_OPERATOR_TYPES: { value: QcOperatorType; label: string; disabled?: boolean }[] = [
  { value: '大模型质检', label: '大模型质检' },
  { value: '工作流质检', label: '工作流质检（暂未开放）', disabled: true },
];

/** 提示词参考（对齐 QC 下钻「参考模板」——填入当前项，不是整棵标准模板） */
export const QC_PROMPT_PRESETS: { label: string; prompt: string }[] = [
  {
    label: '通用质检模板',
    prompt:
      "你是一个专业的客服合规质检员，下面将会给你用户与客服的沟通内容，你需要判断客服本次服务【是否合规】。\n\n判定规则如下：\n规则1：客服按标准业务流程解答用户问题，且无违规行为时，输出'是'。\n规则2：客服存在推诿、敷衍、答非所问、未按流程处理等问题时，输出'否'。\n规则3：无法明确判定时，默认输出'是'。\n\n请输出判定结果（是/否）及具体判定依据（引用对话中的原话片段）。",
  },
  {
    label: '客服辱骂检测',
    prompt:
      "你是一个辱骂内容质检员，你需要根据用户和客服的对话内容，判断客服消息【是否涉及辱骂】。\n\n判定规则如下：\n规则1：当客服消息无任何辱骂词汇时，输出'否'。\n规则2：当客服消息包含辱骂词汇，且从上下文判定确为辱骂用户时，输出'是'。\n\n请输出判定结果（是/否）及命中的原话片段。",
  },
  {
    label: '合规承诺核验',
    prompt:
      "你是一个专业的客服合规质检员，你需要根据对话内容判断客服【是否存在违规承诺】。\n\n判定规则如下：\n规则1：当客服对赔付、时效、结果等做出'保证'、'绝对'、'一定'等超出权限的绝对化承诺时，输出'是'（违规）。\n规则2：当客服使用'我们会尽快'、'预计'、'为您申请'等规范表述时，输出'否'。\n\n请输出判定结果（是/否）并提取违规承诺的原话片段。",
  },
  {
    label: '问题是否解决',
    prompt:
      "你是一个专业的客服合规质检员，下面将会给你用户与客服的沟通内容，你需要识别【问题是否已解决】。\n\n判定规则如下：\n规则1：用户当前问题已解决，输出'是'。\n规则2：客服未实际解决用户核心诉求，或用户明确表示问题仍未解决，输出'否'。\n\n请输出判定结果（是/否）及依据。",
  },
];

export function createMappingRow(
  patch: Partial<QcAnalysisMappingRow> = {},
): QcAnalysisMappingRow {
  return {
    id: newId('map'),
    outputField: '',
    displayName: '',
    reasonField: '',
    maxScore: '',
    scoreField: '',
    ...patch,
  };
}

export const QC_LABEL_PROMPT_PRESETS: { label: string; prompt: string }[] = [
  {
    label: '通用分类标签模板',
    prompt:
      '# 一、角色\n你是一个专业的会话分类标签分析专家，需要根据用户与客服的完整对话内容，为本次会话打上相应的分类标签。\n\n# 二、任务\n请从下列标签体系中，判断本次会话命中的所有标签，并给出判定依据。\n\n# 三、标签体系（可按业务自定义）\n1. 咨询类型：售前咨询 / 售后咨询 / 投诉建议 / 物流查询 / 退换货\n2. 情绪倾向：正向 / 中性 / 负向\n3. 紧急程度：高 / 中 / 低\n4. 是否需人工介入：是 / 否\n\n# 四、判定规则\n规则1：一个会话可命中多个标签，但同一标签维度下只能选一个取值。\n规则2：若某维度无法判定，输出该维度为“未知”。\n规则3：判定依据须引用对话中的原话片段，不得臆测。\n\n# 五、输出格式\n请按【标签维度】=>【取值】=>【依据】的格式逐行输出。',
  },
  {
    label: '意图识别模板',
    prompt:
      '# 一、角色\n你是客服会话意图识别专家。\n\n# 二、任务\n根据完整对话，判断客户核心意图，并给出依据。\n\n# 三、意图体系\n咨询 / 投诉 / 退款 / 催单 / 其它\n\n# 四、输出\n【意图】=>【取值】=>【依据】',
  },
];

export const QC_MULTI_PROMPT_PRESETS: { label: string; prompt: string }[] = [
  {
    label: '通用多维评分模板',
    prompt:
      '# 一、角色\n你是专业的客服体验质检专家。\n\n# 二、任务\n从客户体验视角分析会话，对下列维度分别打分（每维满分 10 分），并给出理由。\n\n# 三、评分维度\n1. 理解需求\n2. 服务态度\n3. 专业知识\n4. 沟通技巧\n5. 响应速度\n6. 问题解决\n7. 整体满意度\n\n# 四、输出\n按维度输出：【维度名】=>【分数】=>【依据】，最后给出总分与总评。',
  },
  {
    label: '服务到我为止模板',
    prompt:
      '# 一、角色\n你是“服务到我为止”理念的质检专家。\n\n# 二、任务\n评估客服是否主动闭环客户问题，避免推诿。\n\n# 三、维度\n主动担责 / 跟进闭环 / 方案清晰度 / 情绪安抚\n\n# 四、输出\n【维度】=>【分数】=>【依据】',
  },
];

export function createDefaultLabelAnalysisConfig(): QcAnalysisConfig {
  return {
    llmDimension: 'session',
    selectedModel: 'qwen-max',
    prompt: QC_LABEL_PROMPT_PRESETS[0].prompt,
    labelMappings: [
      createMappingRow({
        outputField: 'EMOTION_A',
        displayName: '愤怒',
        reasonField: 'REASON_A',
      }),
    ],
    classMappings: [],
  };
}

export function createDefaultMultiAnalysisConfig(): QcAnalysisConfig {
  return {
    llmDimension: 'session',
    selectedModel: 'qwen-max',
    prompt: QC_MULTI_PROMPT_PRESETS[0].prompt,
    labelMappings: [],
    totalMapping: createMappingRow({
      outputField: 'TOTAL_RES',
      displayName: '服务质量评价',
      maxScore: '100',
      scoreField: 'OVERALL_SCORE',
      reasonField: 'OVERALL_REASON',
    }),
    classMappings: [
      createMappingRow({
        outputField: 'SERVICE_A',
        displayName: '服务态度',
        maxScore: '85',
        scoreField: 'SERVICE_ATTITUDE',
        reasonField: 'SERVICE_REASON',
      }),
      createMappingRow({
        outputField: 'PROFESSIONAL',
        displayName: '专业知识',
        maxScore: '90',
        scoreField: 'PROFESSIONAL_SCORE',
        reasonField: 'PROFESSIONAL_REASON',
      }),
      createMappingRow({
        outputField: 'RESPONSE',
        displayName: '响应速度',
        maxScore: '75',
        scoreField: 'RESPONSE_EFFICIENCY',
        reasonField: 'RESPONSE_REASON',
      }),
      createMappingRow({
        outputField: 'COMMUNI',
        displayName: '沟通技巧',
        maxScore: '80',
        scoreField: 'COMMUNICATION',
        reasonField: 'COMMUNI_REASON',
      }),
    ],
    chartEnabled: true,
    chartType: 'radar',
  };
}