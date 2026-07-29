"""
Creagic AI Strategy Engineering Framework
策略工程框架

Creagic AI 设计助手 - 大模型与业务API之间的智能编排层

核心模块:
- config: 配置管理
- memory: 上下文记忆管理
- tools: 工具调用系统
- planning: 任务规划与分解
- validation: 输出验证与质量检查
- multi_agent: 多智能体协作
- persistence: 会话持久化
- core: 核心引擎
"""

__version__ = "1.0.0"
__author__ = "Creagic AI"

from .core import CreagicEngine, EngineConfig
from .config import ConfigManager, ProviderRegistry
from .memory import MemoryManager, MemoryType
from .tools import ToolRegistry, ToolExecutor
from .planning import TaskPlanner, TaskDecomposer, TaskScheduler
from .validation import QualityChecker, RuleRegistry
from .multi_agent import Agent, AgentTeam, AgentCoordinator
from .persistence import SessionStore, BackupManager, SnapshotManager

__all__ = [
    # 核心
    "CreagicEngine",
    "EngineConfig",

    # 配置
    "ConfigManager",
    "ProviderRegistry",

    # 记忆
    "MemoryManager",
    "MemoryType",

    # 工具
    "ToolRegistry",
    "ToolExecutor",

    # 规划
    "TaskPlanner",
    "TaskDecomposer",
    "TaskScheduler",

    # 验证
    "QualityChecker",
    "RuleRegistry",

    # 多 Agent
    "Agent",
    "AgentTeam",
    "AgentCoordinator",

    # 持久化
    "SessionStore",
    "BackupManager",
    "SnapshotManager"
]
