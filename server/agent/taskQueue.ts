import type { ServerResponse } from "node:http";
import { handleImageRequest } from "../aiHandlers";
import type { TaskPlan, ImageTask } from "./taskPlanner";

export type TaskResult = {
  index: number;
  label: string;
  ok: boolean;
  url: string | null;
  error?: string;
};

export type TaskProgress = {
  event: "start" | "progress" | "done" | "error";
  total: number;
  completed: number;
  result?: TaskResult;
  summary?: string;
};

function sseWrite(res: ServerResponse, data: TaskProgress): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function runOne(task: ImageTask, refUrl?: string | null): Promise<TaskResult> {
  try {
    const result = await handleImageRequest({
      prompt: task.prompt,
      skill: null,
      referenceImageUrl: refUrl ?? null,
      imageSize: task.size,
    });
    if (result.status === 200 && typeof result.body.url === "string") {
      return { index: task.index, label: task.label, ok: true, url: result.body.url };
    }
    return {
      index: task.index,
      label: task.label,
      ok: false,
      url: null,
      error: (result.body.error as string) ?? "生成失败",
    };
  } catch (e) {
    return {
      index: task.index,
      label: task.label,
      ok: false,
      url: null,
      error: e instanceof Error ? e.message : "未知错误",
    };
  }
}

async function runParallel(tasks: ImageTask[], res: ServerResponse, refUrl?: string | null): Promise<void> {
  let done = 0;
  sseWrite(res, { event: "start", total: tasks.length, completed: 0 });
  await Promise.allSettled(
    tasks.map(async (task) => {
      const result = await runOne(task, refUrl);
      sseWrite(res, { event: "progress", total: tasks.length, completed: ++done, result });
    })
  );
  sseWrite(res, {
    event: "done",
    total: tasks.length,
    completed: done,
    summary: `完成 ${done}/${tasks.length} 张`,
  });
}

async function runSequential(tasks: ImageTask[], res: ServerResponse, refUrl?: string | null): Promise<void> {
  const results: TaskResult[] = [];
  sseWrite(res, { event: "start", total: tasks.length, completed: 0 });
  for (const task of tasks) {
    let ref = refUrl ?? null;
    if (typeof task.referenceIndex === "number" && task.referenceIndex >= 0) {
      const dep = results[task.referenceIndex];
      if (dep?.ok && dep.url) ref = dep.url;
    }
    const result = await runOne(task, ref);
    results.push(result);
    sseWrite(res, { event: "progress", total: tasks.length, completed: results.length, result });
  }
  sseWrite(res, {
    event: "done",
    total: tasks.length,
    completed: results.length,
    summary: `完成 ${results.length}/${tasks.length} 张`,
  });
}

async function runBrandKit(tasks: ImageTask[], res: ServerResponse): Promise<void> {
  const logo = tasks.find((t) => t.index === 0);
  const rest = tasks.filter((t) => t.index !== 0);
  sseWrite(res, { event: "start", total: tasks.length, completed: 0 });
  let done = 0;
  if (logo) {
    const logoResult = await runOne(logo, null);
    sseWrite(res, { event: "progress", total: tasks.length, completed: ++done, result: logoResult });
    const logoUrl = logoResult.ok ? logoResult.url : null;
    await Promise.allSettled(
      rest.map(async (task) => {
        const result = await runOne(task, logoUrl);
        sseWrite(res, { event: "progress", total: tasks.length, completed: ++done, result });
      })
    );
  } else {
    await Promise.allSettled(
      rest.map(async (task) => {
        const result = await runOne(task, null);
        sseWrite(res, { event: "progress", total: tasks.length, completed: ++done, result });
      })
    );
  }
  sseWrite(res, {
    event: "done",
    total: tasks.length,
    completed: done,
    summary: `品牌套件完成 ${done}/${tasks.length}`,
  });
}

export async function executePlan(plan: TaskPlan, res: ServerResponse, refUrl?: string | null): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  try {
    switch (plan.type) {
      case "batch_parallel":
      case "size_variants":
      case "single_image":
        await runParallel(plan.tasks, res, refUrl);
        break;
      case "batch_sequential":
        await runSequential(plan.tasks, res, refUrl);
        break;
      case "brand_kit":
        await runBrandKit(plan.tasks, res);
        break;
    }
  } catch (e) {
    sseWrite(res, {
      event: "error",
      total: plan.totalCount,
      completed: 0,
      summary: e instanceof Error ? e.message : "任务执行失败",
    });
  } finally {
    if (!res.writableEnded) res.end();
  }
}
