"""
任务调度器

管理任务执行顺序、依赖和并发
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set
import logging

from .planner import Plan, PlanStep, ExecutionStrategy

logger = logging.getLogger(__name__)


class TaskScheduler:
    """
    任务调度器

    功能:
    - 按依赖关系调度任务
    - 支持并行和顺序执行
    - 任务状态追踪
    - 错误恢复
    """

    def __init__(
        self,
        max_parallel: int = 5,
        default_timeout: int = 300,
        enable_retry: bool = True
    ):
        """
        初始化调度器

        Args:
            max_parallel: 最大并行任务数
            default_timeout: 默认超时时间
            enable_retry: 是否启用重试
        """
        self.max_parallel = max_parallel
        self.default_timeout = default_timeout
        self.enable_retry = enable_retry

        self._executors: Dict[str, Callable] = {}
        self._running_tasks: Set[str] = set()
        self._completed_tasks: Set[str] = set()
        self._failed_tasks: Dict[str, str] = {}

        self._executor_pool = ThreadPoolExecutor(max_workers=max_parallel)
        self._event_queue: asyncio.Queue = asyncio.Queue()

    def register_executor(self, task_type: str, executor: Callable):
        """
        注册任务执行器

        Args:
            task_type: 任务类型
            executor: 执行函数 (step, context) -> result
        """
        self._executors[task_type] = executor

    async def execute_plan(
        self,
        plan: Plan,
        context: Optional[Dict[str, Any]] = None,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        执行计划

        Args:
            plan: 执行计划
            context: 执行上下文
            progress_callback: 进度回调函数

        Returns:
            执行结果
        """
        plan.status = "executing"
        results = {}
        context = context or {}

        if plan.strategy == ExecutionStrategy.SEQUENTIAL:
            results = await self._execute_sequential(plan, context, progress_callback)
        elif plan.strategy == ExecutionStrategy.PARALLEL:
            results = await self._execute_parallel(plan, context, progress_callback)
        elif plan.strategy == ExecutionStrategy.PRIORITY:
            results = await self._execute_by_priority(plan, context, progress_callback)
        else:
            results = await self._execute_sequential(plan, context, progress_callback)

        plan.status = "completed" if not plan.failed_steps else "partial"
        return results

    async def _execute_sequential(
        self,
        plan: Plan,
        context: Dict[str, Any],
        callback: Optional[Callable]
    ) -> Dict[str, Any]:
        """顺序执行"""
        results = {}

        for step in plan.steps:
            if step.status in ["completed", "skipped"]:
                continue

            result = await self._execute_step(step, results, context)
            results[step.id] = result

            if callback:
                await callback(step, result)

        return results

    async def _execute_parallel(
        self,
        plan: Plan,
        context: Dict[str, Any],
        callback: Optional[Callable]
    ) -> Dict[str, Any]:
        """并行执行"""
        results = {}
        completed = set()

        while len(completed) < len(plan.steps):
            # 获取可执行的步骤
            ready_steps = [
                step for step in plan.steps
                if step.can_execute(completed) and step.status == "pending"
            ]

            if not ready_steps:
                # 没有可执行的步骤，可能是全部完成或死锁
                break

            # 限制并行数
            batch = ready_steps[:self.max_parallel]

            # 并行执行
            tasks = [
                self._execute_step(step, results, context)
                for step in batch
            ]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for step, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    results[step.id] = {"error": str(result)}
                    plan.update_step_status(plan, step.id, "failed")
                else:
                    results[step.id] = result
                    completed.add(step.id)

                if callback:
                    await callback(step, results[step.id])

        return results

    async def _execute_by_priority(
        self,
        plan: Plan,
        context: Dict[str, Any],
        callback: Optional[Callable]
    ) -> Dict[str, Any]:
        """按优先级执行"""
        results = {}
        completed = set()

        # 按优先级排序
        sorted_steps = sorted(plan.steps, key=lambda s: -s.priority)

        for step in sorted_steps:
            if step.status in ["completed", "skipped"]:
                continue

            # 等待依赖完成
            while not step.can_execute(completed):
                await asyncio.sleep(0.1)

            result = await self._execute_step(step, results, context)
            results[step.id] = result
            completed.add(step.id)

            if callback:
                await callback(step, result)

        return results

    async def _execute_step(
        self,
        step: PlanStep,
        previous_results: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Any:
        """执行单个步骤"""
        step.mark_running()
        self._running_tasks.add(step.id)

        try:
            # 获取执行器
            executor = self._executors.get(step.task_type)
            if not executor:
                # 通用执行器
                executor = self._default_executor

            # 合并上下文
            exec_context = {
                **context,
                "step": step.to_dict() if hasattr(step, 'to_dict') else {"id": step.id, "name": step.name},
                "previous_results": previous_results
            }

            # 执行
            if asyncio.iscoroutinefunction(executor):
                result = await asyncio.wait_for(
                    executor(step, exec_context),
                    timeout=self.default_timeout
                )
            else:
                loop = asyncio.get_event_loop()
                result = await asyncio.wait_for(
                    loop.run_in_executor(
                        self._executor_pool,
                        lambda: executor(step, exec_context)
                    ),
                    timeout=self.default_timeout
                )

            step.mark_completed(result)
            self._completed_tasks.add(step.id)

            return result

        except asyncio.TimeoutError:
            step.mark_failed(f"执行超时 ({self.default_timeout}秒)")
            self._failed_tasks[step.id] = "timeout"
            return {"error": "timeout"}

        except Exception as e:
            logger.exception(f"步骤执行失败: {step.name}")
            step.mark_failed(str(e))
            self._failed_tasks[step.id] = str(e)
            return {"error": str(e)}

        finally:
            self._running_tasks.discard(step.id)

    async def _default_executor(self, step: PlanStep, context: Dict[str, Any]) -> Dict[str, Any]:
        """默认执行器"""
        return {
            "step_id": step.id,
            "step_name": step.name,
            "status": "completed",
            "message": f"步骤 {step.name} 已执行"
        }

    def get_task_status(self) -> Dict[str, Any]:
        """获取任务状态"""
        return {
            "running": list(self._running_tasks),
            "completed": list(self._completed_tasks),
            "failed": self._failed_tasks
        }

    def cancel_task(self, step_id: str) -> bool:
        """取消任务"""
        if step_id in self._running_tasks:
            # 注意：实际取消需要实现任务中断机制
            self._failed_tasks[step_id] = "cancelled"
            self._running_tasks.discard(step_id)
            return True
        return False

    def shutdown(self):
        """关闭调度器"""
        self._executor_pool.shutdown(wait=True)


# 步骤扩展方法
def _to_dict(self) -> Dict[str, Any]:
    """转换为字典"""
    return {
        "id": self.id,
        "name": self.name,
        "description": self.description,
        "task_type": self.task_type,
        "parameters": self.parameters,
        "depends_on": self.depends_on,
        "priority": self.priority,
        "estimated_time": self.estimated_time,
        "status": self.status,
        "result": self.result,
        "error": self.error
    }


# 添加到 PlanStep 类
PlanStep.to_dict = _to_dict
