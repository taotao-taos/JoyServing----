import {
  looksLikeImageEditFollowUp,
  stripRefChipPlainNoise,
} from "./chatRefImage";

/** 是否出现「要出图 / 生成图」类关键词（仅关键词，不决定是否立刻调生图接口） */
export function hasImageRequestKeywords(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  const compact = s.replace(/\s/g, "");

  if (
    /生成图片|生成一幅|生成一张|生图|文生图|出图|画图|作图|制作图|制图|绘图|出图片|画一张|画一幅|画一[张幅只个条辆位]|生成一[张幅只个条辆位]|来一[张幅只个条]|帮我画|帮我生成|做.{0,4}图|做个图|来张图|来一张|搞张图|整图|跑张图|配图|海报图|封面图|插图|绘制|p图|整.{0,2}张图|图片生成|AI渲染|渲染.{0,4}图|text.{0,8}image|generate.{0,12}image|dall-?e|image\s+of/i.test(
      compact
    )
  ) {
    return true;
  }
  /** 「生成两只猫」「画一条龙」等：无「图」字但明显是出图委托 */
  if (
    /(?:^|[\s，,.。!！：:；;])(?:生成|画)\s*(?:[一二三四五六七八九十两\d]+\s*)?[只个条张幅辆位](?![\d年月日])/i.test(
      s
    )
  ) {
    return true;
  }

  if (
    /^(请)?(给|帮)?我?(生成|画|做)/i.test(s) &&
    /图|海报|封面|插画|banner|主视觉|logo|图标|画面|视觉/i.test(s)
  ) {
    return true;
  }

  return false;
}

/** 明显以「成片 / 动效 / 分镜叙事」为主，避免误走文生图（除非同句要静帧/封面/关键帧等） */
export function isVideoPrimaryRequest(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /视频|短片|影片|宣传片|vlog|微电影|动效|MG动画|逐帧动画|分镜脚本|分镜表|运镜|推拉摇移|时间轴|音画同步|配音成片|生成.{0,6}视频|做个视频|做条视频|拍一条|后期成片|剪辑成片|tiktok|抖音(短)?视频|motion\s*graphics|\banimate\b|\banimation\b(?!\s*css)/i.test(
    t
  );
}

/**
 * 用户明确要求生成**成片视频**（应调用 /api/videos），而非只要分镜文字或其它静态图。
 * 与「视频封面头图」等静帧需求区分：仅文案/脚本不要成片时排除。
 */
export function isDirectVideoGenerationRequest(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/只要文字|只要剧本|仅脚本|只要分镜表|别生成视频|不要.{0,2}成片|不用出片|不要mp4/i.test(t)) {
    return false;
  }
  if (/(?:视频|b站|抖音|小红书)?\s*(?:封面|封面图|头图)/i.test(t)) {
    return false;
  }
  return (
    /生视频|生成视频|文生视频|做个视频|出视频|来段视频|来条视频|AI视频|视频生成|生成短片|生成mp4|出个成片|视频成片|直接生成视频|立刻生成视频|t2v|text[\s-]*to[\s-]*video|图生视频|图转视频|给我.{0,8}视频|帮我.{0,8}视频/i.test(
      t
    ) ||
    /生成\s*视频|来.{0,6}视频|出.{0,6}成片|做.{0,6}短片/i.test(t)
  );
}

function wantsStaticFrameForVideo(text: string): boolean {
  return /关键帧|首帧|静帧|定帧|封面|缩略图|thumbnail|先来.{0,4}[张幅]图|分镜.{0,8}图|概念图|故事板|storyboard/i.test(
    text
  );
}

/** 用户明确要求跳过规划、立即走文生图 */
export function wantsImmediateImageGeneration(text: string): boolean {
  return /直接生成|立刻出图|马上生成|跳过规划|确认出图|就按这个出|别再问|别问了|按上面|按上文|按方案生成|可以出了|执行生图|先看图|先出图|来一版|生成一版|试生成|出张效果图|做个效果图|生成吧|那就生成|开始出图/i.test(
    text
  );
}

/** 用户强调要长文档/策略，暂缓出图（除非同句明确要求立刻生图）。避免匹配「继续聊」等日常用语导致误挡生图。 */
export function wantsLongPlanningOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /详细方案|完整策划|分步策划|分阶段(方案|策划)|只要文字|不要图|先别出图|别说图|别急着出图|先.{0,2}(写|出)(文档|文案|大纲|策划)|仅(需|要)文字|不用出图/i.test(
    t
  );
}

/** 多轮对话里对画面/生图的跟进描述（未必再含「图」字） */
export function looksLikeVisualFollowUp(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (hasImageRequestKeywords(t)) return true;
  return /换|改|调整|加上|去掉|更|不要|改成|换个|再来|同款|类似|按|尺寸|比例|竖版|横版|竖|横|大点|小点|亮|暗|简约|复杂|风格|色系|背景|主体|文案|字|图|海报|封面|主视觉|插画|配色|构图|氛围/i.test(
    t
  );
}

function isTrivialUserAck(text: string): boolean {
  const t = text.trim();
  if (t.length > 8) return false;
  return /^(嗯+|好|是的|OK|ok|谢谢|行|可以|明白|收到)[\.。!！]?$/i.test(t);
}

/** 纯寒暄，不走生图 */
function isPureGreeting(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 24) return false;
  return /^(你好|嗨|hi|hello|在吗|早上好|晚上好|谢谢|辛苦了|拜拜|再见)[!.。…\s]*$/i.test(
    t
  );
}

/**
 * 明显是「要文字/代码/解释」类任务，走对话而非生图。
 */
export function wantsCopywritingOrTextTask(text: string): boolean {
  const t = text.trim();
  return /翻译|译成|英译|中译|写一段代码|代码实现|什么是|解释一下|含义是|区别是|怎么用|公式|证明|推导|markdown|json|sql|python|javascript|typescript|报错|异常|堆栈|logs?|只要文|只要字|纯文字|不要画面|只要文案|slogan|口播稿|新闻稿|公关稿|邮件正文|话术|FAQ|知识点|教程步骤|分步骤说明|计算|求解|代码怎么写|函数|接口文档|api\s*文档/i.test(
    t
  );
}

/**
 * 描述是否足够具体，可直接调用生图（与「先意图→需求→规划→再出图」对齐）。
 * 门槛略放宽：非特别复杂时尽量首轮或第二轮即能出图。
 */
function isConcreteEnoughForImageSpec(text: string): boolean {
  const t = text.trim();
  if (t.length >= 32) return true;
  if (/\d{3,4}\s*[×xX]\s*\d{3,4}/.test(t)) return true;
  const signals = [
    "风格",
    "配色",
    "构图",
    "主视觉",
    "海报",
    "封面",
    "场景",
    "氛围",
    "品牌",
    "标题",
    "受众",
    "用途",
    "竖版",
    "横版",
    "比例",
    "调性",
    "光影",
    "参考",
    "元素",
    "文案",
    "分层",
    "留白",
    "极简",
    "复古",
    "插画",
    "摄影",
    "logo",
    "图标",
    "可爱",
    "科技感",
    "国风",
  ];
  let score = 0;
  const lower = t.toLowerCase();
  for (const w of signals) {
    if (/[a-z]/i.test(w) ? lower.includes(w.toLowerCase()) : t.includes(w)) {
      score += 1;
    }
  }
  return score >= 2;
}

/** 明确表达「要出图」的短句 */
export function hasStrongImageIntentVerb(text: string): boolean {
  return /生图|出图|文生图|生成图片|生成图|画一张图|来一张图|做个图|搞张图|跑张图|整一张|上图|出效果图|做效果图/i.test(
    text.trim()
  );
}

export type ImageIntentOptions = {
  /** 上一轮助手侧车规划中标记可出图时，降低「描述需足够具体」门槛 */
  creagicPlanReadyForImage?: boolean;
};

/**
 * 是否应走「文生图」接口：命中出图意图且（描述已足够具体 | 用户明确要求立刻出图 | 规划已就绪）。
 * 否则先走对话，由助手完成意图识别、需求挖掘与任务规划后再让用户补充或说「确认出图」。
 */
export function looksLikeImageRequest(
  text: string,
  options?: ImageIntentOptions
): boolean {
  if (!hasImageRequestKeywords(text)) return false;
  if (wantsImmediateImageGeneration(text)) return true;
  if (hasStrongImageIntentVerb(text)) return true;
  if (isConcreteEnoughForImageSpec(text)) return true;
  const s = text.trim();
  /** 已命中出图关键词且为「动词+数量单位+主体」短指令，不必再要求两个风格词 */
  if (
    /(?:生成|画)\s*(?:[一二三四五六七八九十两]+\s*)?[只个条张幅辆位]\s*\S{1,40}$/i.test(
      s
    ) ||
    /^(?:帮我|给我|请)?(?:画|生成)\s*.{2,40}$/i.test(s)
  ) {
    return true;
  }
  /** 规划就绪也不能单凭关键词就出图，须配合明确出图句或足够具体的画面描述 */
  if (
    options?.creagicPlanReadyForImage &&
    (hasStrongImageIntentVerb(text) ||
      wantsImmediateImageGeneration(text) ||
      isConcreteEnoughForImageSpec(text))
  ) {
    return true;
  }
  return false;
}

/** 统计当前句之前，已有几条用户消息命中出图类关键词 */
export function countPriorImageKeywordUserTurns(
  priorThread: Array<{ role: string; content: string }>,
  richOk: (html: string) => boolean,
  toPlain: (html: string) => string
): number {
  let n = 0;
  for (const m of priorThread) {
    if (m.role !== "user" || !richOk(m.content)) continue;
    const plain = toPlain(m.content).trim();
    if (plain && hasImageRequestKeywords(plain)) n += 1;
  }
  return n;
}

export type ImagePipelineContext = {
  creagicPlanReadyForImage?: boolean;
  /** 当前句之前，已有几条用户消息命中出图关键词 */
  priorImageKeywordTurns: number;
};

/**
 * 是否可走文生图链路（仅意图层）：须明确出图或描述足够具体；不再「提到图字就出图」。
 */
export function shouldUseImagePipeline(
  userPlain: string,
  opts: ImagePipelineContext
): boolean {
  const t = userPlain.trim();
  if (t.length < 2) return false;

  if (
    wantsLongPlanningOnly(t) &&
    !wantsImmediateImageGeneration(t)
  ) {
    return false;
  }

  if (wantsCopywritingOrTextTask(t)) return false;
  if (isPureGreeting(t)) return false;
  if (isTrivialUserAck(t)) return false;

  if (isVideoPrimaryRequest(t)) {
    const mightWantStill =
      hasImageRequestKeywords(t) ||
      wantsStaticFrameForVideo(t) ||
      wantsImmediateImageGeneration(t);
    if (!mightWantStill) return false;
  }

  if (
    looksLikeImageRequest(t, {
      creagicPlanReadyForImage: opts.creagicPlanReadyForImage,
    })
  ) {
    return true;
  }

  if (
    opts.priorImageKeywordTurns >= 1 &&
    looksLikeVisualFollowUp(t) &&
    !isTrivialUserAck(t) &&
    (hasStrongImageIntentVerb(t) ||
      wantsImmediateImageGeneration(t) ||
      isConcreteEnoughForImageSpec(t))
  ) {
    return true;
  }

  return false;
}

/**
 * 用户是否**明确**表达要生成画面（用于自动跟进出图等，避免仅因句子里有「图」字就调用生图 API）。
 */
export function userAskedExplicitImageGeneration(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^(图片呢|图呢|图在哪|图呢\?|图片呢\?|怎么还没图|还没图吗|给我看图|先出图|先给图)$/i.test(t)) {
    return true;
  }
  if (wantsImmediateImageGeneration(t)) return true;
  if (hasStrongImageIntentVerb(t)) return true;
  if (/(?:视频|b站|bilibili|抖音|小红书)?\s*(?:封面|封面图|头图)/i.test(t)) {
    return true;
  }
  if (
    /要一张|来一张|生成\s*(?:图片|图|一幅|一张)|出图|文生图|画一张|来张|海报|主视觉|关键帧|概念图|封面图|首帧|静帧|静态图|效果图|做个?\s*(?:海报|封面)|来张图|做一张图|配图|视觉稿|确认生成|开始出图|立刻生成|马上出图|生成一[只个条张幅辆位]|画一[只个条张幅辆位]|来一[只个条张幅]|帮我画|帮我生成|给我画|给我生成/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /(?:^|[\s，,.。!！：:；;])(?:生成|画)\s*(?:[一二三四五六七八九十两\d]+\s*)?[只个条张幅辆位]/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}

/**
 * 是否允许本回合**直接调用** `/api/images`：须明确要求或足够具体的画面描述；
 * 仅有参考图而无文字说明时不出图，避免「还没说画什么就生成」。
 */
export function isEligibleForDirectImageGeneration(
  userPlain: string,
  opts: {
    hasReferenceImage: boolean;
    treatAsImageEditFollowUp: boolean;
  }
): boolean {
  const t = userPlain.trim();
  const userCore = stripRefChipPlainNoise(userPlain) || userPlain.trim();

  if (wantsLongPlanningOnly(t) && !wantsImmediateImageGeneration(t)) {
    return false;
  }
  if (wantsCopywritingOrTextTask(t)) return false;
  if (isPureGreeting(t)) return false;
  if (isTrivialUserAck(t)) return false;

  if (opts.treatAsImageEditFollowUp) return true;

  if (userAskedExplicitImageGeneration(t)) return true;

  if (
    hasImageRequestKeywords(t) &&
    (isConcreteEnoughForImageSpec(t) || t.length >= 24)
  ) {
    return true;
  }

  if (opts.hasReferenceImage) {
    if (userCore.length >= 8) return true;
    if (
      userCore.length >= 6 &&
      hasImageRequestKeywords(t) &&
      !wantsLongPlanningOnly(t)
    ) {
      return true;
    }
    if (userCore.length >= 2 && looksLikeImageEditFollowUp(t)) return true;
    return false;
  }

  return false;
}
