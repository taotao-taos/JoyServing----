"""
工具执行器

负责工具的调用、超时、重试等
"""

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import logging

from .registry import ToolRegistry, ToolCall, ToolResult

logger = logging.getLogger(__name__)


class ToolExecutor:
    """
    工具执行器

    功能:
    - 同步/异步工具执行
    - 超时控制
    - 自动重试
    - 执行统计
    - 审批流程集成
    """

    def __init__(
        self,
        registry: ToolRegistry,
        max_workers: int = 5,
        default_timeout: int = 30,
        enable_retry: bool = True
    ):
        """
        初始化工具执行器

        Args:
            registry: 工具注册表
            max_workers: 最大并发执行数
            default_timeout: 默认超时时间 (秒)
            enable_retry: 是否启用重试
        """
        self.registry = registry
        self.max_workers = max_workers
        self.default_timeout = default_timeout
        self.enable_retry = enable_retry

        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._pending_approvals: Dict[str, ToolCall] = {}
        self._executed_calls: List[ToolCall] = []

    async def execute(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        user_id: Optional[str] = None,
        require_approval: bool = False,
        timeout: Optional[int] = None
    ) -> ToolResult:
        """
        执行工具

        Args:
            tool_name: 工具名称
            arguments: 工具参数
            user_id: 用户 ID (用于审批)
            require_approval: 是否需要审批
            timeout: 超时时间

        Returns:
            工具执行结果
        """
        # 获取工具定义和实现
        tool_def = self.registry.get(tool_name)
        if not tool_def:
            return ToolResult(
                success=False,
                error=f"未找到工具: {tool_name}"
            )

        implementation = self.registry.get_implementation(tool_name)
        if not implementation:
            return ToolResult(
                success=False,
                error=f"工具 {tool_name} 未注册实现"
            )

        # 参数验证
        valid, error_msg = tool_def.validate_parameters(arguments)
        if not valid:
            return ToolResult(
                success=False,
                error=f"参数验证失败: {error_msg}"
            )

        # 创建调用记录
        call = ToolCall(
            id=str(uuid.uuid4()),
            tool_name=tool_name,
            arguments=arguments
        )

        # 检查是否需要审批
        if require_approval or tool_def.requires_approval:
            self._pending_approvals[call.id] = call
            return ToolResult(
                success=False,
                error="TOOL_REQUIRES_APPROVAL",
                tool_call=call,
                metadata={"requires_approval": True, "approval_id": call.id}
            )

        # 执行工具
        return await self._do_execute(call, implementation, timeout or tool_def.timeout)

    async def _do_execute(
        self,
        call: ToolCall,
        implementation: Callable,
        timeout: int
    ) -> ToolResult:
        """执行工具调用"""
        call.mark_running()
        self.registry.record_call(call)

        # 如果是异步函数
        if asyncio.iscoroutinefunction(implementation):
            try:
                result = await asyncio.wait_for(
                    implementation(**call.arguments),
                    timeout=timeout
                )
                call.mark_success(result)
                return ToolResult(success=True, data=result, tool_call=call)

            except asyncio.TimeoutError:
                call.mark_failed(f"执行超时 ({timeout}秒)")
                return ToolResult(
                    success=False,
                    error=f"执行超时 ({timeout}秒)",
                    tool_call=call
                )

            except Exception as e:
                call.mark_failed(str(e))
                logger.exception(f"工具执行失败: {call.tool_name}")
                return ToolResult(
                    success=False,
                    error=str(e),
                    tool_call=call
                )

        # 如果是同步函数，使用线程池
        else:
            loop = asyncio.get_event_loop()
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(
                        self._executor,
                        lambda: implementation(**call.arguments)
                    ),
                    timeout=timeout
                )
                call.mark_success(result)
                return ToolResult(success=True, data=result, tool_call=call)

            except asyncio.TimeoutError:
                call.mark_failed(f"执行超时 ({timeout}秒)")
                return ToolResult(
                    success=False,
                    error=f"执行超时 ({timeout}秒)",
                    tool_call=call
                )

            except Exception as e:
                call.mark_failed(str(e))
                logger.exception(f"工具执行失败: {call.tool_name}")
                return ToolResult(
                    success=False,
                    error=str(e),
                    tool_call=call
                )

    async def approve(self, approval_id: str) -> ToolResult:
        """批准并执行待审批的工具调用"""
        if approval_id not in self._pending_approvals:
            return ToolResult(success=False, error="未找到待审批的调用")

        call = self._pending_approvals.pop(approval_id)

        tool_def = self.registry.get(call.tool_name)
        implementation = self.registry.get_implementation(call.tool_name)

        if not implementation:
            return ToolResult(
                success=False,
                error=f"工具 {call.tool_name} 未注册实现"
            )

        return await self._do_execute(call, implementation, tool_def.timeout if tool_def else self.default_timeout)

    async def reject(self, approval_id: str, reason: str = "") -> bool:
        """拒绝待审批的工具调用"""
        if approval_id in self._pending_approvals:
            call = self._pending_approvals.pop(approval_id)
            call.mark_failed(f"被拒绝: {reason}")
            self.registry.record_call(call)
            return True
        return False

    def get_pending_approvals(self, user_id: Optional[str] = None) -> List[ToolCall]:
        """获取待审批的调用"""
        calls = list(self._pending_approvals.values())
        if user_id:
            # 可以添加用户过滤逻辑
            pass
        return calls

    async def batch_execute(
        self,
        calls: List[Dict[str, Any]],
        parallel: bool = True
    ) -> List[ToolResult]:
        """
        批量执行工具

        Args:
            calls: 调用列表 [{tool_name, arguments}, ...]
            parallel: 是否并行执行

        Returns:
            执行结果列表
        """
        if parallel:
            tasks = [
                self.execute(call["tool_name"], call["arguments"])
                for call in calls
            ]
            return await asyncio.gather(*tasks)
        else:
            results = []
            for call in calls:
                result = await self.execute(call["tool_name"], call["arguments"])
                results.append(result)
            return results

    def get_execution_history(
        self,
        tool_name: Optional[str] = None,
        limit: int = 100
    ) -> List[ToolCall]:
        """获取执行历史"""
        history = self.registry.get_call_history(tool_name, limit)
        return [c for c in history if c.status != "pending"]

    def get_stats(self) -> Dict[str, Any]:
        """获取执行统计"""
        usage = self.registry.get_usage_stats()

        total_calls = sum(s["total_calls"] for s in usage.get("tools", {}).values())
        successful = sum(s["successful_calls"] for s in usage.get("tools", {}).values())
        failed = sum(s["failed_calls"] for s in usage.get("tools", {}).values())
        total_time = sum(s["total_execution_time"] for s in usage.get("tools", {}).values())

        return {
            "total_calls": total_calls,
            "successful": successful,
            "failed": failed,
            "success_rate": successful / total_calls if total_calls > 0 else 0,
            "avg_execution_time": total_time / total_calls if total_calls > 0 else 0,
            "pending_approvals": len(self._pending_approvals),
            "by_tool": usage.get("tools", {})
        }

    def shutdown(self):
        """关闭执行器"""
        self._executor.shutdown(wait=True)
