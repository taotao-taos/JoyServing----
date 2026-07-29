"""
智能体协调器

负责任务调度、状态管理和结果整合
"""

import asyncio
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import logging

from .agent import Agent, AgentMessage
from .team import AgentTeam, TeamTask, CollaborationMode
from ..config.models import AgentRole

logger = logging.getLogger(__name__)


class TaskStatus(str):
    """任务状态"""
    PENDING = "pending"
    ANALYZING = "analyzing"
    DISPATCHING = "dispatching"
    EXECUTING = "executing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentCoordinator:
    """
    Agent 协调器

    核心功能:
    - 任务接收和初步分析
    - 智能任务分解和分配
    - 多 Agent 协作调度
    - 结果整合和质量把控
    - 异常处理和恢复
    """

    def __init__(
        self,
        team: AgentTeam,
        llm_provider: Any = None,
        auto_approval_threshold: float = 90.0
    ):
        """
        初始化协调器

        Args:
            team: Agent 团队
            llm_provider: LLM 提供者
            auto_approval_threshold: 自动审批阈值
        """
        self.team = team
        self.llm_provider = llm_provider
        self.auto_approval_threshold = auto_approval_threshold

        # 任务状态追踪
        self._task_states: Dict[str, Dict[str, Any]] = {}

        # 工作流定义
        self._workflows: Dict[str, Dict[str, Any]] = {}
        self._register_default_workflows()

        # 回调函数
        self._on_task_start: Optional[Callable] = None
        self._on_task_progress: Optional[Callable] = None
        self._on_task_complete: Optional[Callable] = None
        self._on_approval_required: Optional[Callable] = None

    def _register_default_workflows(self):
        """注册默认工作流"""
        self._workflows["design_generation"] = {
            "name": "设计生成",
            "steps": [
                {"name": "理解需求", "agent_role": "coordinator", "action": "analyze"},
                {"name": "生成设计", "agent_role": "executor", "action": "generate"},
                {"name": "质量检查", "agent_role": "validator", "action": "validate"},
                {"name": "最终审批", "agent_role": "reviewer", "action": "approve"}
            ]
        }

        self._workflows["image_editing"] = {
            "name": "图片编辑",
            "steps": [
                {"name": "理解修改需求", "agent_role": "coordinator", "action": "analyze"},
                {"name": "执行编辑", "agent_role": "executor", "action": "edit"},
                {"name": "效果验证", "agent_role": "validator", "action": "validate"}
            ]
        }

        self._workflows["batch_design"] = {
            "name": "批量设计",
            "steps": [
                {"name": "统一规划", "agent_role": "coordinator", "action": "plan"},
                {"name": "协调分发", "agent_role": "coordinator", "action": "dispatch"},
                {"name": "并行生成", "agent_role": "executor", "action": "batch_generate"},
                {"name": "批量审核", "agent_role": "validator", "action": "batch_validate"}
            ]
        }

    async def process(
        self,
        task_input: str,
        workflow: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        require_approval: bool = True
    ) -> Dict[str, Any]:
        """
        处理任务

        Args:
            task_input: 任务输入
            workflow: 工作流名称
            context: 任务上下文
            require_approval: 是否需要审批

        Returns:
            处理结果
        """
        task_id = str(id(task_input))
        context = context or {}

        # 初始化任务状态
        self._task_states[task_id] = {
            "input": task_input,
            "status": TaskStatus.PENDING,
            "progress": 0,
            "workflow": workflow,
            "context": context,
            "results": {},
            "errors": [],
            "started_at": datetime.now().isoformat()
        }

        try:
            # 触发开始回调
            if self._on_task_start:
                await self._on_task_start(task_id, task_input)

            # 选择工作流
            if not workflow:
                workflow = self._detect_workflow(task_input)

            if workflow and workflow in self._workflows:
                result = await self._execute_workflow(task_id, workflow, context)
            else:
                # 使用默认协作方式
                result = await self._execute_default(task_id, task_input, context)

            # 检查是否需要审批
            if require_approval:
                score = result.get("quality_score", 0)
                if score >= self.auto_approval_threshold:
                    result["approved"] = True
                    result["approval_status"] = "auto_approved"
                else:
                    result["approved"] = None
                    result["approval_status"] = "pending_approval"

                    if self._on_approval_required:
                        await self._on_approval_required(task_id, result)

            # 更新状态
            self._task_states[task_id]["status"] = TaskStatus.COMPLETED
            self._task_states[task_id]["completed_at"] = datetime.now().isoformat()
            self._task_states[task_id]["results"] = result

            # 触发完成回调
            if self._on_task_complete:
                await self._on_task_complete(task_id, result)

            return result

        except Exception as e:
            logger.exception(f"任务处理失败: {task_id}")
            self._task_states[task_id]["status"] = TaskStatus.FAILED
            self._task_states[task_id]["error"] = str(e)
            return {"error": str(e), "task_id": task_id}

    async def _execute_workflow(
        self,
        task_id: str,
        workflow_name: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行工作流"""
        workflow = self._workflows[workflow_name]
        results = {}
        total_steps = len(workflow["steps"])

        for i, step in enumerate(workflow["steps"]):
            step_name = step["name"]
            agent_role = step["agent_role"]
            action = step["action"]

            # 更新进度
            self._task_states[task_id]["status"] = f"{action}_in_progress"
            self._task_states[task_id]["current_step"] = step_name
            self._task_states[task_id]["progress"] = int((i / total_steps) * 100)

            # 触发进度回调
            if self._on_task_progress:
                await self._on_task_progress(
                    task_id,
                    step_name,
                    i + 1,
                    total_steps
                )

            # 获取对应角色的 Agent
            agents = self.team.get_agents_by_role(AgentRole(agent_role))
            if not agents:
                # 创建临时 Agent
                agent = AgentFactory.create_design_agent()
                self.team.add_agent(agent)
                agents = [agent]

            agent = agents[0]

            # 执行步骤
            try:
                if action == "analyze":
                    result = await agent.process(
                        f"分析任务需求: {self._task_states[task_id]['input']}",
                        context
                    )
                elif action == "generate":
                    result = await agent.process(
                        f"根据分析结果生成设计: {results.get('analyze', '')}",
                        context
                    )
                elif action == "validate":
                    result = await agent.process(
                        f"验证设计质量: {results.get('generate', '')}",
                        context
                    )
                elif action == "approve":
                    result = await agent.process(
                        f"审批设计: {results.get('validate', '')}",
                        context
                    )
                else:
                    result = await agent.process(
                        f"执行: {step_name}",
                        {**context, "previous_results": results}
                    )

                results[action] = result

            except Exception as e:
                logger.error(f"步骤 {step_name} 执行失败: {e}")
                results[action] = {"error": str(e)}

        self._task_states[task_id]["progress"] = 100
        return results

    async def _execute_default(
        self,
        task_id: str,
        task_input: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行默认处理"""
        # 使用团队协作
        results = await self.team.dispatch_task(task_input, context)
        return results

    def _detect_workflow(self, task_input: str) -> Optional[str]:
        """检测适合的工作流"""
        task_lower = task_input.lower()

        if any(kw in task_lower for kw in ["生成", "创建", "制作"]):
            if any(kw in task_lower for kw in ["多个", "批量", "系列"]):
                return "batch_design"
            return "design_generation"

        elif any(kw in task_lower for kw in ["编辑", "修改", "调整"]):
            return "image_editing"

        return None

    def get_task_state(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务状态"""
        return self._task_states.get(task_id)

    def approve_task(self, task_id: str, approved: bool, feedback: str = "") -> bool:
        """审批任务"""
        if task_id not in self._task_states:
            return False

        state = self._task_states[task_id]
        state["approved"] = approved
        state["approval_feedback"] = feedback
        state["approved_at"] = datetime.now().isoformat()

        return True

    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        if task_id in self._task_states:
            self._task_states[task_id]["status"] = "cancelled"
            return True
        return False

    def set_callbacks(
        self,
        on_task_start: Optional[Callable] = None,
        on_task_progress: Optional[Callable] = None,
        on_task_complete: Optional[Callable] = None,
        on_approval_required: Optional[Callable] = None
    ):
        """设置回调函数"""
        self._on_task_start = on_task_start
        self._on_task_progress = on_task_progress
        self._on_task_complete = on_task_complete
        self._on_approval_required = on_approval_required

    def register_workflow(self, name: str, steps: List[Dict[str, Any]]):
        """注册自定义工作流"""
        self._workflows[name] = {"name": name, "steps": steps}

    def get_available_workflows(self) -> List[str]:
        """获取可用工作流"""
        return list(self._workflows.keys())

    def get_stats(self) -> Dict[str, Any]:
        """获取协调器统计"""
        states = list(self._task_states.values())
        return {
            "total_tasks": len(states),
            "completed": len([s for s in states if s["status"] == TaskStatus.COMPLETED]),
            "failed": len([s for s in states if s["status"] == TaskStatus.FAILED]),
            "pending": len([s for s in states if s["status"] == TaskStatus.PENDING]),
            "workflows": list(self._workflows.keys())
        }


# 导入 AgentFactory
from .agent import AgentFactory
