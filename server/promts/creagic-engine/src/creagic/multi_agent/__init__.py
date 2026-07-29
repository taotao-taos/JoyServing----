"""
Creagic AI 多智能体协作模块

提供多 Agent 协作、任务分发和状态管理
"""

from .agent import Agent, AgentRole, AgentMessage, AgentFactory
from .team import AgentTeam, CollaborationMode
from .coordinator import AgentCoordinator

__all__ = [
    "Agent",
    "AgentRole",
    "AgentMessage",
    "AgentFactory",
    "AgentTeam",
    "CollaborationMode",
    "AgentCoordinator"
]
