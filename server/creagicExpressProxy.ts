/**
 * 将 /api/creagic/* 转发到 CREAGIC_PYTHON_URL（与 FastAPI 路径一致，去掉 /api/creagic 前缀）。
 */
import type { Express, Request, Response } from "express";
import express from "express";

export function attachCreagicProxy(app: Express): void {
  const py = (process.env.CREAGIC_PYTHON_URL || "").replace(/\/$/, "");
  if (!py) return;
  const internalHeaderName = (
    process.env.CREAGIC_INTERNAL_HEADER_NAME || "x-internal-proxy-token"
  )
    .trim()
    .toLowerCase();
  const internalHeaderValue = (
    process.env.CREAGIC_INTERNAL_HEADER_VALUE || ""
  ).trim();

  const router = express.Router();
  router.use(express.json({ limit: "4mb" }));

  router.all("*", async (req: Request, res: Response) => {
    if (internalHeaderValue) {
      const got = String(req.headers[internalHeaderName] ?? "").trim();
      if (!got || got !== internalHeaderValue) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
    }
    const rel = (req.originalUrl || "").replace(/^\/api\/creagic/, "") || "/";
    const target = `${py}${rel}`;
    try {
      const m = (req.method || "GET").toUpperCase();
      const noBody = m === "GET" || m === "HEAD" || m === "DELETE";
      const r = await fetch(target, {
        method: m,
        ...(!noBody
          ? {
              headers: { "content-type": "application/json" },
              body: JSON.stringify(req.body ?? {}),
            }
          : {}),
      });
      const ct = r.headers.get("content-type");
      if (ct) res.setHeader("content-type", ct);
      res.status(r.status).send(Buffer.from(await r.arrayBuffer()));
    } catch (e) {
      res.status(502).json({ error: e instanceof Error ? e.message : "creagic proxy failed" });
    }
  });

  app.use("/api/creagic", router);
}
