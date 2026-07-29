"""
记忆数据类型定义
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class MemoryType(str, Enum):
    """记忆类型"""
    SEMANTIC = "semantic"      # 语义记忆 - 长期知识
    EPISODIC = "episodic"      # 情景记忆 - 会话经历
    PROCEDURAL = "procedural"  # 程序记忆 - 工作流程
    WORKING = "working"        # 工作记忆 - 当前任务上下文


@dataclass
class MemoryEntry:
    """
    记忆条目

    Attributes:
        id: 唯一标识符
        content: 记忆内容
        memory_type: 记忆类型
        importance: 重要性评分 (0-1)
        embedding: 向量表示
        keywords: 关键词标签
        created_at: 创建时间
        access_count: 访问次数
        last_accessed: 最后访问时间
        expires_at: 过期时间 (可选)
        metadata: 附加元数据
    """
    id: str
    content: str
    memory_type: MemoryType
    importance: float = 0.5
    embedding: Optional[List[float]] = None
    keywords: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def access(self):
        """记录一次访问"""
        self.access_count += 1
        self.last_accessed = datetime.now()

    def is_expired(self) -> bool:
        """检查是否过期"""
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type.value if isinstance(self.memory_type, MemoryType) else self.memory_type,
            "importance": self.importance,
            "keywords": self.keywords,
            "created_at": self.created_at.isoformat(),
            "access_count": self.access_count,
            "last_accessed": self.last_accessed.isoformat() if self.last_accessed else None,
            "metadata": self.metadata
        }


@dataclass
class MemoryQuery:
    """
    记忆查询条件

    Attributes:
        content: 文本查询内容
        memory_type: 记忆类型过滤
        keywords: 关键词过滤
        min_importance: 最低重要性
        limit: 返回数量限制
        offset: 分页偏移
        session_id: 会话 ID 过滤
    """
    content: Optional[str] = None
    memory_type: Optional[MemoryType] = None
    keywords: Optional[List[str]] = None
    min_importance: float = 0.0
    limit: int = 10
    offset: int = 0
    session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "content": self.content,
            "memory_type": self.memory_type.value if self.memory_type else None,
            "keywords": self.keywords,
            "min_importance": self.min_importance,
            "limit": self.limit,
            "offset": self.offset,
            "session_id": self.session_id
        }


@dataclass
class ConversationContext:
    """
    对话上下文

    用于构建发送给 LLM 的上下文消息
    """
    system_prompt: str = ""
    memories: List[MemoryEntry] = field(default_factory=list)
    recent_messages: List[Dict[str, str]] = field(default_factory=list)
    task_context: Optional[Dict[str, Any]] = None
    constraints: Dict[str, Any] = field(default_factory=dict)

    def build_messages(self) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []

        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})

        # 添加相关记忆
        if self.memories:
            memory_content = "\n".join([m.content for m in self.memories])
            messages.append({
                "role": "system",
                "content": f"[相关记忆]\n{memory_content}"
            })

        # 添加任务约束
        if self.constraints:
            constraints_content = "\n".join([f"- {k}: {v}" for k, v in self.constraints.items()])
            messages.append({
                "role": "system",
                "content": f"[任务约束]\n{constraints_content}"
            })

        # 添加最近消息
        messages.extend(self.recent_messages)

        return messages


@dataclass
class MemoryStats:
    """记忆统计信息"""
    total_count: int = 0
    by_type: Dict[str, int] = field(default_factory=dict)
    avg_importance: float = 0.0
    high_importance_count: int = 0
    total_accesses: int = 0
