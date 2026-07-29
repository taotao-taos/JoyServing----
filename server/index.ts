/**
 * 本地 API：转发 AIhubMix OpenAI 兼容接口（可选单独进程；日常开发可用 Vite 内置中间件）
 * @see https://docs.aihubmix.com/cn/api/Aihubmix-Integration
 */
import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import {
  getHealthJson,
  getUpstreamBase,
  handleAgentChatRequest,
  handleChatRequest,
  handleImageRequest,
  handleImageEnhanceRequest,
  handleRemoveBackgroundRequest,
  handleRouteIntentRequest,
  handleStoryboardSplitRequest,
  handleTaskPlanRequest,
  handleVideoRawStream,
  handleVideoRequest,
} from "./aiHandlers";
import { executePlan } from "./agent/taskQueue";
import { planTask } from "./agent/taskPlanner";
import { CHAT_MODELS, IMAGE_MODELS } from "./agent/modelRegistry";
import { attachCreagicProxy } from "./creagicExpressProxy";

const app = express();
const PORT = Number(process.env.PORT) || 3847;
const HOST = (process.env.API_HOST || "127.0.0.1").trim() || "127.0.0.1";
const TRUST_PROXY = Number(process.env.API_TRUST_PROXY_HOPS || 1);

function parseAllowedOrigins(): string[] {
  return String(process.env.API_ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();
const corsDelegate: cors.CorsOptionsDelegate = (req, callback) => {
  const originHeader = req.headers?.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (!origin) {
    callback(null, { origin: false });
    return;
  }
  const ok = allowedOrigins.length > 0 && allowedOrigins.includes(origin);
  callback(null, { origin: ok });
};

const apiLimiter = rateLimit({
  windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.API_RATE_LIMIT_MAX || 90),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "请求过于频繁，请稍后重试" },
});

app.disable("x-powered-by");
app.set("trust proxy", Number.isFinite(TRUST_PROXY) ? TRUST_PROXY : 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);
app.use(cors(corsDelegate));
/** data:image 入抠图/增强时体积较大；与 Liblib 单图 10MB 上限大致对齐 */
app.use(express.json({ limit: "15mb" }));
app.options("/api/*", cors(corsDelegate));
app.use("/api/chat", apiLimiter);
app.use("/api/images", apiLimiter);
app.use("/api/videos", apiLimiter);
app.use("/api/route-intent", apiLimiter);
app.use("/api/agent", apiLimiter);
app.use("/api/tasks", apiLimiter);
attachCreagicProxy(app);

app.get("/api/health", (_req, res) => {
  res.json(getHealthJson());
});

app.get("/api/models", (_req, res) => {
  res.json({ chatModels: CHAT_MODELS, imageModels: IMAGE_MODELS });
});

app.post("/api/chat", async (req, res, next) => {
  try {
    const out = await handleChatRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/images", async (req, res, next) => {
  try {
    const out = await handleImageRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/images/remove-bg", async (req, res, next) => {
  try {
    const out = await handleRemoveBackgroundRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/images/enhance", async (req, res, next) => {
  try {
    const out = await handleImageEnhanceRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/videos", async (req, res, next) => {
  try {
    const out = await handleVideoRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.get("/api/videos/raw/:token", async (req, res, next) => {
  const token = String(req.params.token ?? "").replace(/[^a-f0-9]/gi, "");
  if (token.length < 16) {
    res.status(404).type("text/plain").send("bad token");
    return;
  }
  try {
    await handleVideoRawStream(token, res);
  } catch (e) {
    next(e);
  }
});

app.post("/api/route-intent", async (req, res, next) => {
  try {
    const out = await handleRouteIntentRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/storyboard/split", async (req, res, next) => {
  try {
    const out = await handleStoryboardSplitRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/agent/chat", async (req, res, next) => {
  try {
    const out = await handleAgentChatRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/tasks/plan", async (req, res, next) => {
  try {
    const out = await handleTaskPlanRequest(req.body);
    res.status(out.status).json(out.body);
  } catch (e) {
    next(e);
  }
});

app.post("/api/tasks/stream", async (req, res, next) => {
  try {
    const { plan, referenceImageUrl } = req.body as {
      plan: import("./agent/taskPlanner").TaskPlan;
      referenceImageUrl?: string;
    };
    if (!plan?.tasks?.length) {
      res.status(400).json({ error: "plan.tasks 不能为空" });
      return;
    }
    await executePlan(plan, res, referenceImageUrl ?? null);
  } catch (e) {
    next(e);
  }
});

app.post("/api/tasks/auto", async (req, res, next) => {
  try {
    const { userText, priorContent, referenceImageUrl } = req.body as {
      userText: string;
      priorContent?: string;
      referenceImageUrl?: string;
    };
    if (!userText?.trim()) {
      res.status(400).json({ error: "userText 必填" });
      return;
    }
    const plan = await planTask(userText, priorContent);
    if (!plan || plan.tasks.length === 0) {
      res.status(200).json({ error: "无法解析为多图任务，请使用 /api/agent/chat" });
      return;
    }
    await executePlan(plan, res, referenceImageUrl ?? null);
  } catch (e) {
    next(e);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[api] unhandled error", err instanceof Error ? err.stack ?? msg : err);
  if (res.headersSent) return;
  const isProd = process.env.NODE_ENV === "production";
  const exposeDetail = !isProd || process.env.API_EXPOSE_ERROR_DETAILS === "1";
  res.status(500).json({
    error: "服务内部错误",
    ...(exposeDetail && msg ? { detail: msg.slice(0, 2000) } : {}),
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[api] http://${HOST}:${PORT}  → ${getUpstreamBase()}`);
});
