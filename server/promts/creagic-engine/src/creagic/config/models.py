"""
Creagic AI 核心数据模型
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class MessageRole(str, Enum):
    """消息角色"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"
    AGENT = "agent"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    PLANNING = "planning"
    EXECUTING = "executing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ValidationLevel(str, Enum):
    """验证级别"""
    STRICT = "strict"      # 严格模式 - 必须通过所有检查
    NORMAL = "normal"      # 普通模式 - 警告但不阻塞
    RELAXED = "relaxed"    # 宽松模式 - 仅记录问题


class AgentRole(str, Enum):
    """Agent 角色"""
    COORDINATOR = "coordinator"    # 协调者 - 负责任务分发
    EXECUTOR = "executor"         # 执行者 - 负责具体任务
    VALIDATOR = "validator"       # 验证者 - 负责质量检查
    REVIEWER = "reviewer"         # 审核者 - 负责最终审批


@dataclass
class MemoryEntry:
    """记忆条目"""
    id: str
    content: str
    memory_type: str  # semantic, episodic, procedural
    importance: float = 0.5  # 0-1 重要性评分
    embedding: Optional[List[float]] = None
    created_at: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def access(self):
        """记录访问"""
        self.access_count += 1
        self.last_accessed = datetime.now()


@dataclass
class ToolDefinition:
    """工具定义"""
    name: str
    description: str
    parameters: Dict[str, Any]
    return_schema: Dict[str, Any]
    category: str
    tags: List[str] = field(default_factory=list)
    requires_approval: bool = False
    timeout: int = 30  # 秒
    retry_count: int = 3


@dataclass
class ValidationRule:
    """验证规则"""
    id: str
    name: str
    description: str
    check_type: str  # format, dimension, color, brand, consistency
    rule_config: Dict[str, Any]
    level: ValidationLevel
    weight: float = 1.0  # 权重
    enabled: bool = True
    error_message: str = ""


@dataclass
class Agent:
    """Agent 定义"""
    id: str
    name: str
    role: AgentRole
    description: str
    capabilities: List[str]
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    system_prompt: str = ""
    tools: List[str] = field(default_factory=list)  # 工具名称列表
    priority: int = 0  # 优先级


@dataclass
class Message:
    """对话消息"""
    id: str
    role: MessageRole
    content: str
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    attachments: List[Dict[str, Any]] = field(default_factory=list)
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


@dataclass
class Task:
    """任务"""
    id: str
    description: str
    status: TaskStatus = TaskStatus.PENDING
    priority: int = 0
    parent_id: Optional[str] = None
    subtasks: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    constraints: Dict[str, Any] = field(default_factory=dict)
    assigned_agent: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class Session:
    """会话"""
    id: str
    user_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    messages: List[Message] = field(default_factory=list)
    tasks: List[Task] = field(default_factory=list)
    memory_ids: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True


@dataclass
class ExecutionResult:
    """执行结果"""
    success: bool
    output: Any = None
    error: Optional[str] = None
    validation_results: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    execution_time: float = 0.0


@dataclass
class ValidationResult:
    """验证结果"""
    passed: bool
    score: float  # 0-100
    checks: List[Dict[str, Any]]
    issues: List[Dict[str, Any]]
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
