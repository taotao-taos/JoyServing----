/**
 * 在 Vite dev / preview 进程内直接处理 /api/*，不依赖单独起 Express，
 * 避免代理打到错误端口或其它进程时出现 Cannot POST /api/images。
 */
import "dotenv/config";
import type { Connect, Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getHealthJson,
  handleAgentChatRequest,
  handleChatRequest,
  handleImageRequest,
  handleImageEnhanceRequest,
  handleRemoveBackgroundRequest,
  handleStoryboardSplitRequest,
  handleRouteIntentRequest,
  handleTaskPlanRequest,
  handleVideoRawStream,
  handleVideoRequest,
} from "./server/aiHandlers";
import { executePlan } from "./server/agent/taskQueue";
import { planTask } from "./server/agent/taskPlanner";
import { CHAT_MODELS, IMAGE_MODELS } from "./server/agent/modelRegistry";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function viteExposeErrorDetail(): boolean {
  const isProd = process.env.NODE_ENV === "production";
  return !isProd || process.env.API_EXPOSE_ERROR_DETAILS === "1";
}

function sendJsonInternalError(res: ServerResponse, err: unknown, logLabel: string) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[vite-api] ${logLabel}`, err instanceof Error ? err.stack ?? msg : err);
  const detail = viteExposeErrorDetail() && msg ? msg.slice(0, 2000) : "";
  sendJson(res, 500, {
    error: "服务内部错误",
    ...(detail ? { detail } : {}),
  });
}

function installApiMiddleware(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = (req.url ?? "").split("?")[0] ?? "";
    if (!url.startsWith("/api/")) {
      next();
      return;
    }

    const nodeRes = res as ServerResponse;

    if (url.startsWith("/api/creagic")) {
      const py = (process.env.CREAGIC_PYTHON_URL || "").replace(/\/$/, "");
      if (!py) {
        sendJson(nodeRes, 503, { error: "CREAGIC_PYTHON_URL 未配置" });
        return;
      }
      const rel = url.replace(/^\/api\/creagic/, "") || "/";
      const qs = (req.url ?? "").includes("?")
        ? "?" + (req.url ?? "").split("?").slice(1).join("?")
        : "";
      const target = `${py}${rel}${qs}`;
      const method = (req.method || "GET").toUpperCase();
      const noBody = method === "GET" || method === "HEAD" || method === "DELETE";
      let fwdBody: string | undefined;
      if (!noBody) {
        fwdBody = await readBody(req as IncomingMessage);
      }
      try {
        const r = await fetch(target, {
          method,
          headers: fwdBody ? { "content-type": "application/json" } : {},
          body: fwdBody,
        });
        const ct = r.headers.get("content-type");
        if (ct) nodeRes.setHeader("content-type", ct);
        nodeRes.statusCode = r.status;
        nodeRes.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) {
        sendJson(nodeRes, 502, {
          error: e instanceof Error ? e.message : "creagic proxy failed",
        });
      }
      return;
    }

    if (req.method === "GET" && (url === "/api/health" || url === "/api/health/")) {
      sendJson(nodeRes, 200, getHealthJson());
      return;
    }

    if (req.method === "GET" && (url === "/api/models" || url === "/api/models/")) {
      sendJson(nodeRes, 200, { chatModels: CHAT_MODELS, imageModels: IMAGE_MODELS });
      return;
    }

    const videoRawMatch = /^\/api\/videos\/raw\/([^/?]+)\/?$/.exec(url);
    if (req.method === "GET" && videoRawMatch) {
      const token = String(videoRawMatch[1] ?? "").replace(/[^a-f0-9]/gi, "");
      if (token.length < 16) {
        nodeRes.statusCode = 404;
        nodeRes.setHeader("Content-Type", "text/plain; charset=utf-8");
        nodeRes.end("bad token");
        return;
      }
      await handleVideoRawStream(token, nodeRes);
      return;
    }

    if (req.method === "POST" && (url === "/api/chat" || url === "/api/chat/")) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as unknown) : {};
        const out = await handleChatRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/images" || url === "/api/images/")) {
      let body: unknown = {};
      try {
        const raw = await readBody(req as IncomingMessage);
        body = raw ? (JSON.parse(raw) as unknown) : {};
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
        return;
      }
      try {
        const out = await handleImageRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch (e) {
        sendJsonInternalError(nodeRes, e, "images");
      }
      return;
    }

    if (
      req.method === "POST" &&
      (url === "/api/images/remove-bg" || url === "/api/images/remove-bg/")
    ) {
      let body: unknown = {};
      try {
        const raw = await readBody(req as IncomingMessage);
        body = raw ? (JSON.parse(raw) as unknown) : {};
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
        return;
      }
      try {
        const out = await handleRemoveBackgroundRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch (e) {
        sendJsonInternalError(nodeRes, e, "remove-bg");
      }
      return;
    }

    if (
      req.method === "POST" &&
      (url === "/api/images/enhance" || url === "/api/images/enhance/")
    ) {
      let body: unknown = {};
      try {
        const raw = await readBody(req as IncomingMessage);
        body = raw ? (JSON.parse(raw) as unknown) : {};
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
        return;
      }
      try {
        const out = await handleImageEnhanceRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch (e) {
        sendJsonInternalError(nodeRes, e, "enhance");
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/videos" || url === "/api/videos/")) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as unknown) : {};
        const out = await handleVideoRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
      }
      return;
    }

    if (
      req.method === "POST" &&
      (url === "/api/storyboard/split" || url === "/api/storyboard/split/")
    ) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as unknown) : {};
        const out = await handleStoryboardSplitRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
      }
      return;
    }

    if (
      req.method === "POST" &&
      (url === "/api/route-intent" || url === "/api/route-intent/")
    ) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as unknown) : {};
        const out = await handleRouteIntentRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/agent/chat" || url === "/api/agent/chat/")) {
      let body: unknown = {};
      try {
        const raw = await readBody(req as IncomingMessage);
        body = raw ? (JSON.parse(raw) as unknown) : {};
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
        return;
      }
      try {
        const out = await handleAgentChatRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch (e) {
        sendJsonInternalError(nodeRes, e, "agent/chat");
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/tasks/plan" || url === "/api/tasks/plan/")) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as unknown) : {};
        const out = await handleTaskPlanRequest(body);
        sendJson(nodeRes, out.status, out.body);
      } catch {
        sendJson(nodeRes, 400, { error: "无效 JSON" });
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/tasks/stream" || url === "/api/tasks/stream/")) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const plan = body.plan as import("./server/agent/taskPlanner").TaskPlan | undefined;
        if (!plan?.tasks?.length) {
          sendJson(nodeRes, 400, { error: "plan.tasks 不能为空" });
          return;
        }
        const referenceImageUrl =
          typeof body.referenceImageUrl === "string" ? body.referenceImageUrl : null;
        await executePlan(plan, nodeRes, referenceImageUrl ?? null);
      } catch (e) {
        sendJson(nodeRes, 502, {
          error: e instanceof Error ? e.message : "任务执行失败",
        });
      }
      return;
    }

    if (req.method === "POST" && (url === "/api/tasks/auto" || url === "/api/tasks/auto/")) {
      try {
        const raw = await readBody(req as IncomingMessage);
        const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const userText = String(body.userText ?? "").trim();
        if (!userText) {
          sendJson(nodeRes, 400, { error: "userText 必填" });
          return;
        }
        const priorContent =
          typeof body.priorContent === "string" ? body.priorContent : undefined;
        const plan = await planTask(userText, priorContent);
        if (!plan || plan.tasks.length === 0) {
          sendJson(nodeRes, 200, { error: "无法解析为多图任务，请使用 /api/agent/chat" });
          return;
        }
        const referenceImageUrl =
          typeof body.referenceImageUrl === "string" ? body.referenceImageUrl : null;
        await executePlan(plan, nodeRes, referenceImageUrl ?? null);
      } catch (e) {
        sendJson(nodeRes, 502, {
          error: e instanceof Error ? e.message : "任务执行失败",
        });
      }
      return;
    }

    next();
  });
}

export function viteLocalApiPlugin(): Plugin {
  return {
    name: "vite-plugin-local-api",
    configureServer: {
      order: "pre",
      handler(server) {
        installApiMiddleware(server.middlewares);
      },
    },
    configurePreviewServer: {
      order: "pre",
      handler(server) {
        installApiMiddleware(server.middlewares);
      },
    },
  };
}
