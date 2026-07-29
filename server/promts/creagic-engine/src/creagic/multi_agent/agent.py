"""
智能体定义

定义单个 Agent 的结构和行为
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid

from ..config.models import AgentRole


@dataclass
class AgentMessage:
    """
    Agent 消息

    Attributes:
        id: 消息 ID
        sender_id: 发送者 ID
        receiver_id: 接收者 ID (可选，用于点对点消息)
        content: 消息内容
        message_type: 消息类型
        metadata: 附加信息
        created_at: 创建时间
        attachments: 附件列表
    """
    id: str
    sender_id: str
    receiver_id: Optional[str] = None
    content: str = ""
    message_type: str = "text"  # text, task, approval, result
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    attachments: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "content": self.content,
            "message_type": self.message_type,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "attachments": self.attachments
        }


@dataclass
class Agent:
    """
    智能体

    Attributes:
        id: Agent ID
        name: Agent 名称
        role: Agent 角色
        description: Agent 描述
        capabilities: 能力列表
        system_prompt: 系统提示词
        tools: 可用工具列表
        model: 使用的模型
        temperature: 温度参数
        status: 当前状态
        current_task: 当前任务
        message_queue: 消息队列
    """
    id: str
    name: str
    role: AgentRole
    description: str
    capabilities: List[str] = field(default_factory=list)
    system_prompt: str = ""
    tools: List[str] = field(default_factory=list)
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096

    # 运行时状态
    status: str = "idle"  # idle, busy, offline
    current_task: Optional[str] = None
    message_queue: List[AgentMessage] = field(default_factory=list)
    completed_tasks: List[str] = field(default_factory=list)
    failed_tasks: List[str] = field(default_factory=list)

    # LLM 提供者 (运行时注入)
    llm_provider: Optional[Any] = None

    def can_handle(self, task_type: str) -> bool:
        """检查是否能处理某类任务"""
        return task_type in self.capabilities

    def assign_task(self, task_id: str):
        """分配任务"""
        self.current_task = task_id
        self.status = "busy"

    def complete_task(self, task_id: str, result: Any):
        """完成任务"""
        if self.current_task == task_id:
            self.current_task = None
            self.status = "idle"
        self.completed_tasks.append(task_id)
        return result

    def fail_task(self, task_id: str, error: str):
        """任务失败"""
        if self.current_task == task_id:
            self.current_task = None
            self.status = "idle"
        self.failed_tasks.append(task_id)
        return error

    def receive_message(self, message: AgentMessage):
        """接收消息"""
        self.message_queue.append(message)

    def get_next_message(self) -> Optional[AgentMessage]:
        """获取下一条消息"""
        if self.message_queue:
            return self.message_queue.pop(0)
        return None

    async def process(self, input_data: Any, context: Dict[str, Any]) -> Any:
        """
        处理任务

        Args:
            input_data: 输入数据
            context: 上下文

        Returns:
            处理结果
        """
        if not self.llm_provider:
            raise ValueError(f"Agent {self.id} 未配置 LLM 提供者")

        # 构建消息
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]

        # 添加上下文
        if context:
            context_str = "\n".join([f"{k}: {v}" for k, v in context.items()])
            messages.append({
                "role": "system",
                "content": f"[上下文]\n{context_str}"
            })

        # 添加输入
        messages.append({
            "role": "user",
            "content": str(input_data)
        })

        # 调用 LLM
        try:
            response = await self.llm_provider.agenerate(
                messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            return response
        except Exception as e:
            raise RuntimeError(f"Agent 处理失败: {str(e)}")

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "description": self.description,
            "capabilities": self.capabilities,
            "tools": self.tools,
            "model": self.model,
            "status": self.status,
            "current_task": self.current_task,
            "completed_tasks": self.completed_tasks,
            "failed_tasks": self.failed_tasks
        }


class AgentFactory:
    """Agent 工厂"""

    @staticmethod
    def create_coordinator(name: str = "Coordinator", model: str = "gpt-4o") -> Agent:
        """创建协调者 Agent"""
        return Agent(
            id=str(uuid.uuid4()),
            name=name,
            role=AgentRole.COORDINATOR,
            description="任务协调者，负责分析任务需求并分配给合适的 Agent",
            capabilities=["task_analysis", "task_decomposition", "agent_dispatch"],
            system_prompt="""你是一个专业的任务协调者。你的职责是：
1. 理解用户的设计需求
2. 将复杂任务分解为子任务
3. 将任务分配给合适的执行者
4. 协调多个 Agent 的工作
5. 整合最终结果

请始终保持清晰的任务规划和有效的资源调度。""",
            tools=["task_planner", "agent_dispatcher"],
            model=model
        )

    @staticmethod
    def create_executor(name: str = "Executor", model: str = "gpt-4o-mini") -> Agent:
        """创建执行者 Agent"""
        return Agent(
            id=str(uuid.uuid4()),
            name=name,
            role=AgentRole.EXECUTOR,
            description="任务执行者，负责具体的生成和创作工作",
            capabilities=["image_generation", "design", "editing"],
            system_prompt="""你是一个专业的设计执行者。你的职责是：
1. 根据指令执行具体的创作任务
2. 生成高质量的设计作品
3. 遵循设计规范和风格要求
4. 及时报告执行进度和结果

专注于高效、准确地完成任务。""",
            tools=["generate_image", "edit_image", "variate_image"],
            model=model
        )

    @staticmethod
    def create_validator(name: str = "Validator", model: str = "gpt-4o") -> Agent:
        """创建验证者 Agent"""
        return Agent(
            id=str(uuid.uuid4()),
            name=name,
            role=AgentRole.VALIDATOR,
            description="质量验证者，负责检查输出质量和合规性",
            capabilities=["quality_check", "brand_compliance", "consistency_check"],
            system_prompt="""你是一个严格的质量验证者。你的职责是：
1. 按照标准检查输出质量
2. 验证品牌合规性
3. 检查内容一致性
4. 提供具体的改进建议
5. 确保最终输出符合要求

严格把关，不放过任何质量问题。""",
            tools=["check_quality", "brand_validator", "consistency_checker"],
            model=model
        )

    @staticmethod
    def create_reviewer(name: str = "Reviewer", model: str = "gpt-4o") -> Agent:
        """创建审核者 Agent"""
        return Agent(
            id=str(uuid.uuid4()),
            name=name,
            role=AgentRole.REVIEWER,
            description="人工审核辅助者，协助人类进行最终审批",
            capabilities=["approval", "feedback", "iteration"],
            system_prompt="""你是一个专业的人工审核辅助者。你的职责是：
1. 整理并呈现待审核内容
2. 总结关键信息和潜在问题
3. 收集审核意见和反馈
4. 协调迭代修改流程
5. 推进最终审批

帮助人类做出明智的审核决策。""",
            tools=["summarize", "compare", "annotate"],
            model=model
        )

    @staticmethod
    def create_design_agent(name: str = "DesignAgent", model: str = "gpt-4o") -> Agent:
        """创建设计 Agent"""
        return Agent(
            id=str(uuid.uuid4()),
            name=name,
            role=AgentRole.EXECUTOR,
            description="专业设计助手，负责各种视觉设计任务",
            capabilities=[
                "semantic_understanding",
                "style_design",
                "image_generation",
                "visual_creation",
                "brand_design"
            ],
            system_prompt="""你是一个专业的设计助手，专注于帮助用户完成各种视觉设计项目。

你的专长包括：
1. 深刻理解设计需求和用户意图
2. 提供专业的设计建议和创意方向
3. 生成海报、品牌设计、社交封面等视觉内容
4. 保持设计风格的一致性和品牌调性
5. 持续优化直到用户满意

请始终以专业的设计视角为用户提供帮助。""",
            tools=[
                "generate_image",
                "edit_image",
                "variate_image",
                "search_inspiration",
                "check_quality"
            ],
            model=model
        )
