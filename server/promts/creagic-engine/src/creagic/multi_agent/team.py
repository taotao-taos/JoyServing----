"""
智能体团队

管理多个 Agent 的协作
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
import asyncio
import uuid
import logging

from .agent import Agent, AgentMessage
from ..config.models import AgentRole

logger = logging.getLogger(__name__)


class CollaborationMode(str, Enum):
    """协作模式"""
    HIERARCHICAL = "hierarchical"      # 层级协作
    PEER_TO_PEER = "peer_to_peer"      # 点对点协作
    ROUND_ROBIN = "round_robin"        # 轮询协作
    CENTRALIZED = "centralized"        # 中心化协作


@dataclass
class TeamTask:
    """团队任务"""
    id: str
    description: str
    status: str = "pending"  # pending, assigned, in_progress, completed, failed
    assigned_agents: List[str] = field(default_factory=list)
    results: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class AgentTeam:
    """
    智能体团队

    功能:
    - 管理多个 Agent
    - 任务分发和追踪
    - 消息路由
    - 协作模式切换
    """

    def __init__(
        self,
        name: str,
        collaboration_mode: CollaborationMode = CollaborationMode.HIERARCHICAL
    ):
        """
        初始化团队

        Args:
            name: 团队名称
            collaboration_mode: 协作模式
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.collaboration_mode = collaboration_mode

        # Agent 管理
        self._agents: Dict[str, Agent] = {}
        self._role_mapping: Dict[AgentRole, List[str]] = {}

        # 任务管理
        self._tasks: Dict[str, TeamTask] = {}
        self._task_queue: asyncio.Queue = asyncio.Queue()

        # 消息管理
        self._message_history: List[AgentMessage] = []

        # 协调者引用
        self._coordinator: Optional[Agent] = None

        # 回调函数
        self._on_task_complete: Optional[Callable] = None
        self._on_agent_message: Optional[Callable] = None

    def add_agent(self, agent: Agent) -> bool:
        """
        添加 Agent 到团队

        Args:
            agent: Agent 实例

        Returns:
            是否添加成功
        """
        if agent.id in self._agents:
            return False

        self._agents[agent.id] = agent

        # 更新角色映射
        if agent.role not in self._role_mapping:
            self._role_mapping[agent.role] = []
        self._role_mapping[agent.role].append(agent.id)

        # 如果是协调者角色
        if agent.role == AgentRole.COORDINATOR:
            self._coordinator = agent

        logger.info(f"Agent {agent.name} (role={agent.role.value}) 加入团队")
        return True

    def remove_agent(self, agent_id: str) -> bool:
        """移除 Agent"""
        if agent_id not in self._agents:
            return False

        agent = self._agents[agent_id]

        # 从角色映射中移除
        if agent.role in self._role_mapping:
            self._role_mapping[agent.role].remove(agent_id)

        del self._agents[agent_id]

        if self._coordinator and self._coordinator.id == agent_id:
            self._coordinator = None

        logger.info(f"Agent {agent.name} 离开团队")
        return True

    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """获取 Agent"""
        return self._agents.get(agent_id)

    def get_agents_by_role(self, role: AgentRole) -> List[Agent]:
        """按角色获取 Agent"""
        agent_ids = self._role_mapping.get(role, [])
        return [self._agents[aid] for aid in agent_ids if aid in self._agents]

    def list_agents(self) -> List[Agent]:
        """列出所有 Agent"""
        return list(self._agents.values())

    def create_task(
        self,
        description: str,
        assigned_agents: Optional[List[str]] = None
    ) -> TeamTask:
        """创建任务"""
        task = TeamTask(
            id=str(uuid.uuid4()),
            description=description,
            assigned_agents=assigned_agents or []
        )
        self._tasks[task.id] = task
        return task

    def assign_task(self, task_id: str, agent_id: str) -> bool:
        """分配任务给 Agent"""
        if task_id not in self._tasks or agent_id not in self._agents:
            return False

        task = self._tasks[task_id]
        agent = self._agents[agent_id]

        if agent_id not in task.assigned_agents:
            task.assigned_agents.append(agent_id)

        agent.assign_task(task_id)
        return True

    async def dispatch_task(
        self,
        task_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        分发任务

        Args:
            task_description: 任务描述
            context: 任务上下文

        Returns:
            任务结果
        """
        # 创建任务
        task = self.create_task(task_description)

        # 根据协作模式分发
        if self.collaboration_mode == CollaborationMode.HIERARCHICAL:
            return await self._hierarchical_dispatch(task, context)
        elif self.collaboration_mode == CollaborationMode.PEER_TO_PEER:
            return await self._p2p_dispatch(task, context)
        elif self.collaboration_mode == CollaborationMode.ROUND_ROBIN:
            return await self._round_robin_dispatch(task, context)
        else:
            return await self._hierarchical_dispatch(task, context)

    async def _hierarchical_dispatch(
        self,
        task: TeamTask,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """层级分发：先分析，再执行，最后验证"""
        results = {}

        # 1. 协调者分析任务
        if self._coordinator:
            coordinator = self._coordinator
            self.assign_task(task.id, coordinator.id)

            analysis = await coordinator.process(
                f"分析任务: {task.description}",
                context or {}
            )
            results["analysis"] = analysis
            coordinator.complete_task(task.id, analysis)

        # 2. 执行者执行
        executors = self.get_agents_by_role(AgentRole.EXECUTOR)
        if executors:
            executor = executors[0]
            self.assign_task(task.id, executor.id)

            execution = await executor.process(
                f"执行任务: {task.description}\n分析结果: {results.get('analysis', '')}",
                context or {}
            )
            results["execution"] = execution
            executor.complete_task(task.id, execution)

        # 3. 验证者验证
        validators = self.get_agents_by_role(AgentRole.VALIDATOR)
        if validators:
            validator = validators[0]
            self.assign_task(task.id, validator.id)

            validation = await validator.process(
                f"验证执行结果: {results.get('execution', '')}",
                context or {}
            )
            results["validation"] = validation
            validator.complete_task(task.id, validation)

        task.status = "completed"
        task.completed_at = datetime.now()
        task.results = results

        return results

    async def _p2p_dispatch(
        self,
        task: TeamTask,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """点对点分发：所有相关 Agent 共同处理"""
        results = {}

        # 获取所有可处理此任务的 Agent
        capable_agents = [
            agent for agent in self._agents.values()
            if task.description  # 简化：假设所有 Agent 都可处理
        ]

        # 并行执行
        async def process_agent(agent: Agent):
            self.assign_task(task.id, agent.id)
            result = await agent.process(task.description, context or {})
            agent.complete_task(task.id, result)
            return agent.name, result

        agent_results = await asyncio.gather(
            *[process_agent(a) for a in capable_agents],
            return_exceptions=True
        )

        for result in agent_results:
            if isinstance(result, tuple):
                name, value = result
                results[name] = value
            elif isinstance(result, Exception):
                logger.error(f"Agent 处理失败: {result}")

        task.status = "completed"
        task.completed_at = datetime.now()
        task.results = results

        return results

    async def _round_robin_dispatch(
        self,
        task: TeamTask,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """轮询分发：按顺序每个 Agent 处理一步"""
        results = {}
        agents = list(self._agents.values())

        for i, agent in enumerate(agents):
            self.assign_task(task.id, agent.id)

            result = await agent.process(
                f"[步骤 {i+1}/{len(agents)}] {task.description}",
                {**(context or {}), "step": i + 1, "total_steps": len(agents), "previous_results": results}
            )

            results[agent.name] = result
            agent.complete_task(task.id, result)

        task.status = "completed"
        task.completed_at = datetime.now()
        task.results = results

        return results

    async def send_message(
        self,
        from_agent_id: str,
        to_agent_id: str,
        content: str,
        message_type: str = "text",
        metadata: Optional[Dict] = None
    ) -> AgentMessage:
        """发送消息"""
        message = AgentMessage(
            id=str(uuid.uuid4()),
            sender_id=from_agent_id,
            receiver_id=to_agent_id,
            content=content,
            message_type=message_type,
            metadata=metadata or {}
        )

        # 记录消息
        self._message_history.append(message)

        # 投递到目标 Agent
        to_agent = self._agents.get(to_agent_id)
        if to_agent:
            to_agent.receive_message(message)

        # 触发回调
        if self._on_agent_message:
            await self._on_agent_message(message)

        return message

    def broadcast(
        self,
        from_agent_id: str,
        content: str,
        message_type: str = "text",
        target_roles: Optional[List[AgentRole]] = None
    ) -> List[AgentMessage]:
        """广播消息"""
        messages = []

        # 确定目标
        if target_roles:
            target_agents = []
            for role in target_roles:
                target_agents.extend(self.get_agents_by_role(role))
        else:
            target_agents = list(self._agents.values())

        # 发送消息
        for agent in target_agents:
            if agent.id != from_agent_id:
                message = AgentMessage(
                    id=str(uuid.uuid4()),
                    sender_id=from_agent_id,
                    receiver_id=agent.id,
                    content=content,
                    message_type=message_type
                )
                agent.receive_message(message)
                self._message_history.append(message)
                messages.append(message)

        return messages

    def get_task(self, task_id: str) -> Optional[TeamTask]:
        """获取任务"""
        return self._tasks.get(task_id)

    def list_tasks(self, status: Optional[str] = None) -> List[TeamTask]:
        """列出任务"""
        tasks = list(self._tasks.values())
        if status:
            tasks = [t for t in tasks if t.status == status]
        return tasks

    def get_stats(self) -> Dict[str, Any]:
        """获取团队统计"""
        return {
            "team_id": self.id,
            "team_name": self.name,
            "collaboration_mode": self.collaboration_mode.value,
            "total_agents": len(self._agents),
            "agents_by_role": {
                role.value: len(agent_ids)
                for role, agent_ids in self._role_mapping.items()
            },
            "total_tasks": len(self._tasks),
            "pending_tasks": len([t for t in self._tasks.values() if t.status == "pending"]),
            "completed_tasks": len([t for t in self._tasks.values() if t.status == "completed"]),
            "messages_sent": len(self._message_history),
            "busy_agents": len([a for a in self._agents.values() if a.status == "busy"])
        }

    def set_callbacks(
        self,
        on_task_complete: Optional[Callable] = None,
        on_agent_message: Optional[Callable] = None
    ):
        """设置回调函数"""
        self._on_task_complete = on_task_complete
        self._on_agent_message = on_agent_message
