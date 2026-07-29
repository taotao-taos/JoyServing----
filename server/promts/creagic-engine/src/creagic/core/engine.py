"""
Creagic AI 策略工程核心引擎

统一管理所有模块，提供一致的接口
"""

import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from ..config.manager import ConfigManager
from ..config.registry import ProviderRegistry
from ..memory.manager import MemoryManager
from ..memory.types import MemoryType, ConversationContext
from ..tools.registry import ToolRegistry, get_design_tools
from ..tools.executor import ToolExecutor
from ..planning.planner import TaskPlanner
from ..planning.decomposer import TaskDecomposer
from ..planning.scheduler import TaskScheduler
from ..validation.checker import QualityChecker
from ..validation.rules import RuleRegistry
from ..validation.fixer import AutoFixer
from ..multi_agent.agent import AgentFactory
from ..multi_agent.team import AgentTeam, CollaborationMode
from ..multi_agent.coordinator import AgentCoordinator
from ..persistence.session import SessionStore, SessionState
from ..persistence.backup import BackupManager
from ..persistence.snapshot import SnapshotManager

logger = logging.getLogger(__name__)


@dataclass
class EngineConfig:
    """引擎配置"""
    # LLM 配置
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    api_key: str = ""

    # 存储配置
    storage_path: str = "./data"
    session_storage_type: str = "file"  # memory, sqlite, file

    # 记忆配置
    max_memory_entries: int = 1000
    memory_retention_days: int = 30

    # 工具配置
    tool_timeout: int = 30
    tool_parallel_limit: int = 5

    # 验证配置
    validation_level: str = "normal"
    min_quality_score: float = 70.0

    # 多 Agent 配置
    enable_multi_agent: bool = True
    max_agents: int = 5

    # 备份配置
    enable_auto_backup: bool = True
    backup_interval: int = 3600
    max_backups: int = 10


class CreagicEngine:
    """
    Creagic AI 策略工程核心引擎

    整合六大核心能力:
    1. 上下文记忆管理 (Context Memory)
    2. 工具调用系统 (Tool Calling)
    3. 任务规划与分解 (Task Planning)
    4. 输出验证与质量检查 (Validation)
    5. 多 Agent 协作 (Multi-Agent)
    6. 会话持久化 (Session Persistence)
    """

    def __init__(self, config: Optional[EngineConfig] = None):
        """
        初始化引擎

        Args:
            config: 引擎配置
        """
        self.config = config or EngineConfig()
        self.config_manager = ConfigManager()

        # 初始化 LLM 提供者
        self._init_llm_provider()

        # 初始化记忆管理
        self._init_memory_manager()

        # 初始化工具系统
        self._init_tools()

        # 初始化规划系统
        self._init_planning()

        # 初始化验证系统
        self._init_validation()

        # 初始化多 Agent 系统
        self._init_multi_agent()

        # 初始化持久化系统
        self._init_persistence()

        logger.info("Creagic Engine 初始化完成")

    def _init_llm_provider(self):
        """初始化 LLM 提供者"""
        self.llm_provider = ProviderRegistry.create(
            provider_name=self.config.llm_provider,
            api_key=self.config.api_key,
            model=self.config.llm_model,
            base_url=os.environ.get("AIHUBMIX_BASE_URL", "https://aihubmix.com/v1").rstrip("/"),
        )

    def _init_memory_manager(self):
        """初始化记忆管理"""
        self.memory_manager = MemoryManager(
            max_entries=self.config.max_memory_entries,
            retention_days=self.config.memory_retention_days,
            embedding_provider=lambda texts: self.llm_provider.embeddings(texts)
        )

    def _init_tools(self):
        """初始化工具系统"""
        self.tool_registry = ToolRegistry()
        self.tool_executor = ToolExecutor(
            registry=self.tool_registry,
            max_workers=self.config.tool_parallel_limit,
            default_timeout=self.config.tool_timeout
        )

        # 注册设计工具
        for tool_def in get_design_tools():
            self.tool_registry.register(
                tool_def,
                implementation=self._default_tool_implementation
            )

    def _init_planning(self):
        """初始化规划系统"""
        self.task_planner = TaskPlanner(
            llm_provider=self.llm_provider,
            max_subtasks=10
        )
        self.task_decomposer = TaskDecomposer(max_depth=3)
        self.task_scheduler = TaskScheduler(
            max_parallel=self.config.tool_parallel_limit
        )

    def _init_validation(self):
        """初始化验证系统"""
        from ..config.models import ValidationLevel
        level = ValidationLevel(self.config.validation_level)

        self.quality_checker = QualityChecker(
            default_level=level,
            min_score=self.config.min_quality_score
        )
        self.rule_registry = RuleRegistry()
        self.auto_fixer = AutoFixer(max_retries=3)

    def _init_multi_agent(self):
        """初始化多 Agent 系统"""
        self.agent_team = AgentTeam(
            name="Creagic Team",
            collaboration_mode=CollaborationMode.HIERARCHICAL
        )

        if self.config.enable_multi_agent:
            # 添加预设 Agent
            design_agent = AgentFactory.create_design_agent()
            design_agent.llm_provider = self.llm_provider
            self.agent_team.add_agent(design_agent)

            validator = AgentFactory.create_validator()
            validator.llm_provider = self.llm_provider
            self.agent_team.add_agent(validator)

        self.coordinator = AgentCoordinator(
            team=self.agent_team,
            llm_provider=self.llm_provider
        )

    def _init_persistence(self):
        """初始化持久化系统"""
        self.session_store = SessionStore(
            storage_type=self.config.session_storage_type,
            storage_path=f"{self.config.storage_path}/sessions"
        )

        self.backup_manager = BackupManager(
            backup_dir=f"{self.config.storage_path}/backups",
            max_backups=self.config.max_backups,
            backup_interval=self.config.backup_interval
        )

        self.snapshot_manager = SnapshotManager(
            storage_path=f"{self.config.storage_path}/snapshots"
        )

        if self.config.enable_auto_backup:
            self.backup_manager.start_auto_backup()

    async def process(
        self,
        task: str,
        user_id: str = "default",
        session_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        处理任务

        Args:
            task: 任务描述
            user_id: 用户 ID
            session_id: 会话 ID
            context: 任务上下文
            options: 处理选项

        Returns:
            处理结果
        """
        options = options or {}
        session_id = session_id or str(uuid.uuid4())
        context = context or {}

        # 1. 获取或创建会话
        session = self.session_store.get(session_id)
        if not session:
            session = self.session_store.create(session_id, user_id)

        # 2. 记录用户消息
        session.add_message("user", task)
        self.session_store.update(session)

        # 3. 检索相关记忆
        related_memories = self.memory_manager.recall(
            query=task,
            session_id=session_id,
            top_k=5
        )

        # 4. 构建上下文
        ctx = self.memory_manager.build_context(
            session_id=session_id,
            query=task,
            system_prompt="你是一个专业的设计助手，专注于帮助用户完成各种视觉设计项目。",
            constraints=context
        )

        # 5. 任务规划
        plan = self.task_planner.create_plan(
            task=task,
            context=context,
            available_tools=[t.name for t in self.tool_registry.list_tools()]
        )

        # 6. 执行计划
        results = {}
        for step in plan.steps:
            step_result = await self._execute_step(step, ctx)
            results[step.id] = step_result

            # 更新上下文
            ctx.recent_messages.append({
                "role": "assistant",
                "content": str(step_result)
            })

        # 7. 质量验证
        validation_result = await self.quality_checker.check(
            output=results,
            context=context
        )

        # 8. 存储记忆
        for memory_content in [task] + [str(r) for r in results.values()]:
            self.memory_manager.store(
                content=memory_content,
                memory_type=MemoryType.EPISODIC,
                session_id=session_id,
                importance=0.6
            )

        # 9. 记录响应
        final_response = self._build_response(results, validation_result)
        session.add_message("assistant", final_response["content"])
        self.session_store.update(session)

        # 10. 返回结果
        return {
            "session_id": session_id,
            "task": task,
            "response": final_response,
            "plan": plan.to_dict(),
            "validation": validation_result.to_dict(),
            "memories_used": len(related_memories)
        }

    async def _execute_step(self, step, context: ConversationContext) -> Any:
        """执行计划步骤：支持工具型步骤或 LLM 生成。"""
        params = step.parameters or {}
        tool_name = params.get("tool_name") or params.get("tool")
        if tool_name and self.tool_registry.get(tool_name):
            exec_args = params.get("arguments")
            if not isinstance(exec_args, dict):
                exec_args = {
                    k: v
                    for k, v in params.items()
                    if k not in ("tool_name", "tool", "arguments")
                }
            res = await self.tool_executor.execute(
                tool_name, exec_args, require_approval=False
            )
            if res.success:
                return res.data
            return {"error": res.error, "metadata": res.metadata}

        messages = [
            {"role": "system", "content": context.system_prompt},
            {"role": "user", "content": f"任务: {step.name}\n{step.description}"},
        ]
        return await self.llm_provider.agenerate(messages)

    async def _default_tool_implementation(self, **kwargs) -> Any:
        """默认工具实现"""
        return {"status": "success", "message": "Tool executed"}

    def _build_response(
        self,
        results: Dict[str, Any],
        validation: Any
    ) -> Dict[str, Any]:
        """构建响应"""
        return {
            "content": "\n\n".join([
                f"**{k}**: {v}"
                for k, v in results.items()
            ]),
            "quality_score": validation.score,
            "passed": validation.passed
        }

    # ========== 公共 API ==========

    def create_session(self, user_id: str) -> SessionState:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        return self.session_store.create(session_id, user_id)

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """获取会话"""
        return self.session_store.get(session_id)

    def list_sessions(self, user_id: Optional[str] = None) -> List[SessionState]:
        """列出会话"""
        return self.session_store.list(user_id=user_id)

    def add_memory(
        self,
        content: str,
        memory_type: MemoryType,
        session_id: str
    ) -> Any:
        """添加记忆"""
        return self.memory_manager.store(
            content=content,
            memory_type=memory_type,
            session_id=session_id
        )

    def recall_memories(
        self,
        query: str,
        session_id: Optional[str] = None
    ) -> List[Any]:
        """检索记忆"""
        return self.memory_manager.recall(
            query=query,
            session_id=session_id
        )

    def register_tool(self, name: str, func: Callable, description: str):
        """注册工具"""
        from ..tools.schemas import ToolDefinition
        tool_def = ToolDefinition(
            name=name,
            description=description
        )
        self.tool_registry.register(tool_def, func)

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Any:
        """执行工具"""
        result = await self.tool_executor.execute(tool_name, arguments)
        return result

    async def validate_output(
        self,
        output: Any,
        context: Optional[Dict[str, Any]] = None
    ) -> Any:
        """验证输出"""
        return await self.quality_checker.check(output, context=context)

    def create_snapshot(
        self,
        name: str,
        description: str = "",
        tags: Optional[List[str]] = None
    ) -> Any:
        """创建快照"""
        data = {
            "sessions": [
                s.to_dict() for s in self.session_store.list()
            ],
            "config": self.config.__dict__
        }
        return self.snapshot_manager.create(
            name=name,
            data=data,
            description=description,
            tags=tags
        )

    def restore_snapshot(self, snapshot_id: str) -> bool:
        """恢复快照"""
        snapshot = self.snapshot_manager.get(snapshot_id)
        if not snapshot:
            return False

        # 恢复会话
        for session_data in snapshot.data.get("sessions", []):
            self.session_store.import_session(
                json.dumps(session_data)
            )

        return True

    def get_stats(self) -> Dict[str, Any]:
        """获取引擎统计"""
        return {
            "memory": self.memory_manager.get_stats().__dict__,
            "tools": self.tool_registry.get_usage_stats(),
            "sessions": self.session_store.get_stats(),
            "snapshots": self.snapshot_manager.get_stats(),
            "agents": self.agent_team.get_stats()
        }

    def shutdown(self):
        """关闭引擎"""
        self.backup_manager.stop_auto_backup()
        self.tool_executor.shutdown()
        self.task_scheduler.shutdown()
        logger.info("Creagic Engine 已关闭")
