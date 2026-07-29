"""
任务规划器

智能分析任务需求，生成执行计划
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid

from ..config.models import Task, TaskStatus


class ExecutionStrategy(str, Enum):
    """执行策略"""
    SEQUENTIAL = "sequential"    # 顺序执行
    PARALLEL = "parallel"        # 并行执行
    PRIORITY = "priority"         # 按优先级执行
    CONDITIONAL = "conditional"   # 条件执行


@dataclass
class PlanStep:
    """
    计划步骤

    Attributes:
        id: 步骤 ID
        name: 步骤名称
        description: 步骤描述
        task_type: 任务类型
        parameters: 执行参数
        depends_on: 依赖的步骤 ID
        priority: 执行优先级
        estimated_time: 预估执行时间 (秒)
        status: 执行状态
        result: 执行结果
        error: 错误信息
    """
    id: str
    name: str
    description: str = ""
    task_type: str = "general"
    parameters: Dict[str, Any] = field(default_factory=dict)
    depends_on: List[str] = field(default_factory=list)
    priority: int = 0
    estimated_time: int = 60
    status: str = "pending"  # pending, ready, running, completed, failed, skipped
    result: Any = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    def can_execute(self, completed_steps: set) -> bool:
        """检查是否可以执行"""
        if self.status != "pending":
            return False
        return all(dep in completed_steps for dep in self.depends_on)

    def mark_running(self):
        self.status = "running"
        self.started_at = datetime.now()

    def mark_completed(self, result: Any):
        self.status = "completed"
        self.result = result
        self.completed_at = datetime.now()

    def mark_failed(self, error: str):
        self.status = "failed"
        self.error = error
        self.completed_at = datetime.now()


@dataclass
class Plan:
    """
    执行计划

    Attributes:
        id: 计划 ID
        original_task: 原始任务描述
        steps: 执行步骤列表
        strategy: 执行策略
        context: 计划上下文
        created_at: 创建时间
        status: 计划状态
        completed_steps: 已完成步骤数
    """
    id: str
    original_task: str
    steps: List[PlanStep] = field(default_factory=list)
    strategy: ExecutionStrategy = ExecutionStrategy.SEQUENTIAL
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "created"  # created, executing, completed, failed, cancelled
    estimated_time: int = 0  # 总预估时间

    def __post_init__(self):
        self.estimated_time = sum(s.estimated_time for s in self.steps)

    def get_step(self, step_id: str) -> Optional[PlanStep]:
        """获取步骤"""
        for step in self.steps:
            if step.id == step_id:
                return step
        return None

    def get_ready_steps(self) -> List[PlanStep]:
        """获取可执行的步骤"""
        completed = {s.id for s in self.steps if s.status == "completed"}
        return [s for s in self.steps if s.can_execute(completed)]

    def is_complete(self) -> bool:
        """检查是否完成"""
        return all(s.status in ["completed", "skipped", "failed"] for s in self.steps)

    def get_results(self) -> Dict[str, Any]:
        """获取所有步骤结果"""
        return {
            step.id: step.result
            for step in self.steps
            if step.result is not None
        }

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "original_task": self.original_task,
            "strategy": self.strategy.value,
            "steps": [
                {
                    "id": s.id,
                    "name": s.name,
                    "description": s.description,
                    "status": s.status,
                    "result": s.result,
                    "error": s.error
                }
                for s in self.steps
            ],
            "status": self.status,
            "estimated_time": self.estimated_time
        }


class TaskPlanner:
    """
    任务规划器

    功能:
    - 分析任务需求
    - 生成执行步骤
    - 管理执行计划
    - 支持条件分支
    """

    def __init__(
        self,
        llm_provider: Any = None,
        max_subtasks: int = 10,
        decomposition_depth: int = 3,
        planning_prompt: Optional[str] = None
    ):
        """
        初始化任务规划器

        Args:
            llm_provider: LLM 提供者 (用于生成复杂计划)
            max_subtasks: 最大子任务数
            decomposition_depth: 分解深度
            planning_prompt: 自定义规划提示
        """
        self.llm_provider = llm_provider
        self.max_subtasks = max_subtasks
        self.decomposition_depth = decomposition_depth
        self.planning_prompt = planning_prompt or self._default_planning_prompt

        # 预定义的任务模板
        self._task_templates: Dict[str, List[Dict[str, Any]]] = {}

    @property
    def _default_planning_prompt(self) -> str:
        return """你是一个专业的任务规划助手。请分析以下任务，将其分解为具体的执行步骤。

任务: {task}

请按照以下 JSON 格式返回计划:
{{
    "steps": [
        {{
            "name": "步骤名称",
            "description": "步骤描述",
            "task_type": "步骤类型 (analysis, design, generation, validation, etc.)",
            "priority": 优先级 (1-10),
            "estimated_time": 预估时间(秒),
            "depends_on": ["依赖步骤名称"]
        }}
    ],
    "strategy": "执行策略 (sequential/parallel/priority)",
    "context": {{"额外上下文"}}
}}

注意:
1. 步骤应该清晰、可执行
2. 考虑步骤间的依赖关系
3. 优先使用并行执行提高效率
4. 每个步骤应该能独立验证结果"""

    def create_plan(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        available_tools: Optional[List[str]] = None
    ) -> Plan:
        """
        创建执行计划

        Args:
            task: 任务描述
            context: 任务上下文
            available_tools: 可用工具列表

        Returns:
            执行计划
        """
        plan_id = str(uuid.uuid4())
        plan = Plan(
            id=plan_id,
            original_task=task,
            context=context or {}
        )

        # 如果有 LLM，使用它来生成计划
        if self.llm_provider:
            return self._generate_llm_plan(plan, task, context, available_tools)

        # 否则使用启发式方法
        return self._generate_heuristic_plan(plan, task, context, available_tools)

    def _generate_heuristic_plan(
        self,
        plan: Plan,
        task: str,
        context: Optional[Dict[str, Any]],
        available_tools: Optional[List[str]]
    ) -> Plan:
        """使用启发式方法生成计划"""
        task_lower = task.lower()
        steps = []

        # 意图识别
        if any(kw in task_lower for kw in ["生成", "创建", "制作", "设计"]):
            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="需求分析",
                description="理解用户设计需求",
                task_type="analysis",
                priority=10
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="风格规划",
                description="确定设计风格和方向",
                task_type="design",
                priority=9
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="视觉生成",
                description="生成设计作品",
                task_type="generation",
                priority=8
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="质量检查",
                description="验证生成结果质量",
                task_type="validation",
                priority=7
            ))

        elif any(kw in task_lower for kw in ["编辑", "修改", "调整", "优化"]):
            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="理解修改需求",
                description="分析需要修改的内容",
                task_type="analysis",
                priority=10
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="执行修改",
                description="进行图片编辑",
                task_type="generation",
                priority=9
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="结果验证",
                description="验证修改效果",
                task_type="validation",
                priority=8
            ))

        elif any(kw in task_lower for kw in ["检查", "审核", "评估", "质量"]):
            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="收集作品信息",
                description="获取待检查的作品",
                task_type="analysis",
                priority=10
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="执行质量检查",
                description="按照标准检查质量",
                task_type="validation",
                priority=9
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="生成报告",
                description="输出检查结果和建议",
                task_type="output",
                priority=8
            ))

        else:
            # 默认计划
            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="理解任务",
                description=task,
                task_type="analysis",
                priority=10
            ))

            steps.append(PlanStep(
                id=str(uuid.uuid4()),
                name="执行任务",
                description="完成指定工作",
                task_type="execution",
                priority=9
            ))

        plan.steps = steps
        plan.estimated_time = sum(s.estimated_time for s in steps)

        return plan

    def _generate_llm_plan(
        self,
        plan: Plan,
        task: str,
        context: Optional[Dict[str, Any]],
        available_tools: Optional[List[str]]
    ) -> Plan:
        """使用 LLM 生成计划"""
        try:
            prompt = self.planning_prompt.format(
                task=task,
                context=context or {},
                available_tools=available_tools or []
            )

            messages = [
                {"role": "system", "content": "你是一个专业的任务规划助手。请分析任务并生成执行计划。"},
                {"role": "user", "content": prompt}
            ]

            response = self.llm_provider.generate(messages)

            # 解析响应
            import json
            data = json.loads(response)

            steps = []
            for step_data in data.get("steps", []):
                step = PlanStep(
                    id=str(uuid.uuid4()),
                    name=step_data.get("name", ""),
                    description=step_data.get("description", ""),
                    task_type=step_data.get("task_type", "general"),
                    priority=step_data.get("priority", 5),
                    estimated_time=step_data.get("estimated_time", 60)
                )
                steps.append(step)

            plan.steps = steps
            plan.strategy = ExecutionStrategy(data.get("strategy", "sequential"))
            plan.estimated_time = sum(s.estimated_time for s in steps)

        except Exception as e:
            # 降级到启发式
            return self._generate_heuristic_plan(plan, task, context, available_tools)

        return plan

    def register_template(self, name: str, steps: List[Dict[str, Any]]):
        """注册任务模板"""
        self._task_templates[name] = steps

    def create_plan_from_template(
        self,
        template_name: str,
        parameters: Dict[str, Any]
    ) -> Optional[Plan]:
        """从模板创建计划"""
        if template_name not in self._task_templates:
            return None

        template = self._task_templates[template_name]
        plan_id = str(uuid.uuid4())

        steps = []
        for step_data in template:
            step = PlanStep(
                id=str(uuid.uuid4()),
                name=step_data["name"],
                description=step_data["description"],
                task_type=step_data.get("task_type", "general"),
                priority=step_data.get("priority", 5),
                estimated_time=step_data.get("estimated_time", 60),
                parameters=parameters
            )
            steps.append(step)

        return Plan(
            id=plan_id,
            original_task=f"Template: {template_name}",
            steps=steps
        )

    def add_step(self, plan: Plan, step: PlanStep, after_step: Optional[str] = None):
        """添加步骤到计划"""
        if after_step:
            for i, s in enumerate(plan.steps):
                if s.id == after_step:
                    plan.steps.insert(i + 1, step)
                    break
        else:
            plan.steps.append(step)

        plan.estimated_time += step.estimated_time

    def remove_step(self, plan: Plan, step_id: str) -> bool:
        """从计划中移除步骤"""
        for i, step in enumerate(plan.steps):
            if step.id == step_id:
                plan.steps.pop(i)
                plan.estimated_time -= step.estimated_time

                # 移除依赖
                for s in plan.steps:
                    if step_id in s.depends_on:
                        s.depends_on.remove(step_id)

                return True
        return False

    def update_step_status(self, plan: Plan, step_id: str, status: str):
        """更新步骤状态"""
        step = plan.get_step(step_id)
        if step:
            step.status = status
