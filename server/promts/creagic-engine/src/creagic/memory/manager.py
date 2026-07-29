"""
记忆管理器

统一管理多种类型的记忆，提供智能检索和上下文构建
"""

import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable

from .types import (
    MemoryType, MemoryEntry, MemoryQuery,
    ConversationContext, MemoryStats
)
from .vector_store import VectorStore
from .context_window import ContextWindow


class MemoryManager:
    """
    统一记忆管理器

    功能:
    - 多层次记忆存储 (语义、情景、程序、工作)
    - 向量相似度检索
    - 智能上下文构建
    - 自动记忆压缩和过期清理
    """

    def __init__(
        self,
        max_entries: int = 1000,
        importance_threshold: float = 0.3,
        retention_days: int = 30,
        embedding_provider: Optional[Callable[[List[str]], List[List[float]]]] = None,
        vector_store_path: Optional[str] = None
    ):
        """
        初始化记忆管理器

        Args:
            max_entries: 最大记忆条目数
            importance_threshold: 重要性阈值
            retention_days: 记忆保留天数
            embedding_provider: 嵌入向量生成函数
            vector_store_path: 向量存储路径
        """
        self.max_entries = max_entries
        self.importance_threshold = importance_threshold
        self.retention_days = retention_days

        # 嵌入函数
        self._embedding_provider = embedding_provider or (lambda texts: [[0.0] * 1536] * len(texts))

        # 存储
        self._memories: Dict[str, MemoryEntry] = {}
        self._session_memories: Dict[str, List[str]] = {}  # session_id -> memory_ids

        # 向量索引
        self._vector_store = VectorStore(
            dimension=1536,
            storage_path=vector_store_path
        )

        # 上下文窗口
        self._context_window = ContextWindow()

        # 统计
        self._stats = MemoryStats()

    def store(
        self,
        content: str,
        memory_type: MemoryType,
        session_id: Optional[str] = None,
        importance: float = 0.5,
        keywords: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        generate_embedding: bool = True
    ) -> MemoryEntry:
        """
        存储记忆

        Args:
            content: 记忆内容
            memory_type: 记忆类型
            session_id: 会话 ID
            importance: 重要性 (0-1)
            keywords: 关键词
            metadata: 元数据
            generate_embedding: 是否生成嵌入向量

        Returns:
            创建的记忆条目
        """
        memory_id = str(uuid.uuid4())

        # 生成嵌入向量
        embedding = None
        if generate_embedding:
            try:
                embeddings = self._embedding_provider([content])
                embedding = embeddings[0] if embeddings else None
            except Exception:
                pass

        # 创建记忆条目
        entry = MemoryEntry(
            id=memory_id,
            content=content,
            memory_type=memory_type,
            importance=importance,
            embedding=embedding,
            keywords=keywords or [],
            metadata=metadata or {}
        )

        # 设置过期时间
        if memory_type in [MemoryType.WORKING, MemoryType.EPISODIC]:
            entry.expires_at = datetime.now() + timedelta(days=self.retention_days)

        # 存储
        self._memories[memory_id] = entry

        # 关联会话
        if session_id:
            if session_id not in self._session_memories:
                self._session_memories[session_id] = []
            self._session_memories[session_id].append(memory_id)

        # 添加到向量索引
        if embedding:
            self._vector_store.add(
                id=memory_id,
                vector=embedding,
                metadata={
                    "memory_type": memory_type.value,
                    "session_id": session_id,
                    "importance": importance,
                    "keywords": keywords or []
                }
            )

        # 更新统计
        self._update_stats()

        # 检查容量限制
        self._check_capacity()

        return entry

    def recall(
        self,
        query: str,
        memory_type: Optional[MemoryType] = None,
        session_id: Optional[str] = None,
        top_k: int = 5,
        min_importance: float = 0.0
    ) -> List[MemoryEntry]:
        """
        检索记忆

        Args:
            query: 查询文本
            memory_type: 记忆类型过滤
            session_id: 会话 ID 过滤
            top_k: 返回数量
            min_importance: 最低重要性

        Returns:
            相关记忆列表
        """
        results = []

        # 生成查询向量
        try:
            embeddings = self._embedding_provider([query])
            query_vector = embeddings[0]
        except Exception:
            query_vector = None

        # 如果有向量，使用向量检索
        if query_vector:
            filter_metadata = {}
            if memory_type:
                filter_metadata["memory_type"] = memory_type.value
            if session_id:
                filter_metadata["session_id"] = session_id

            vector_results = self._vector_store.search(
                query_vector=query_vector,
                top_k=top_k * 2,  # 获取更多结果用于过滤
                filter_metadata=filter_metadata if filter_metadata else None
            )

            for memory_id, score, metadata in vector_results:
                entry = self._memories.get(memory_id)
                if entry and not entry.is_expired():
                    entry.access()
                    if entry.importance >= min_importance:
                        results.append(entry)
        else:
            # 降级为关键词匹配
            query_lower = query.lower()
            for entry in self._memories.values():
                if entry.is_expired():
                    continue
                if memory_type and entry.memory_type != memory_type:
                    continue
                if session_id and entry.metadata.get("session_id") != session_id:
                    continue
                if query_lower in entry.content.lower():
                    entry.access()
                    if entry.importance >= min_importance:
                        results.append(entry)

        # 排序并限制数量
        results.sort(key=lambda x: (x.importance, x.access_count), reverse=True)
        return results[:top_k]

    def get_session_memories(self, session_id: str) -> List[MemoryEntry]:
        """获取会话的所有记忆"""
        memory_ids = self._session_memories.get(session_id, [])
        memories = []

        for memory_id in memory_ids:
            entry = self._memories.get(memory_id)
            if entry and not entry.is_expired():
                memories.append(entry)

        return memories

    def build_context(
        self,
        session_id: str,
        query: Optional[str] = None,
        system_prompt: str = "",
        constraints: Optional[Dict[str, Any]] = None
    ) -> ConversationContext:
        """
        构建对话上下文

        Args:
            session_id: 会话 ID
            query: 当前查询 (用于检索相关记忆)
            system_prompt: 系统提示
            constraints: 任务约束

        Returns:
            对话上下文
        """
        context = ConversationContext(
            system_prompt=system_prompt,
            constraints=constraints or {}
        )

        # 获取会话记忆
        session_memories = self.get_session_memories(session_id)
        context.memories = session_memories

        # 如果有查询，检索相关记忆
        if query:
            related = self.recall(query, session_id=session_id, top_k=3)
            context.memories = related + [
                m for m in context.memories if m not in related
            ]

        # 从上下文窗口获取最近消息
        context.recent_messages = [
            {"role": item.role, "content": item.content}
            for item in self._context_window.get_all()
        ]

        return context

    def add_to_context(self, content: str, role: str = "user", priority: int = 0):
        """添加消息到上下文窗口"""
        self._context_window.add(
            id=str(uuid.uuid4()),
            content=content,
            role=role,
            priority=priority
        )

    def update_memory_importance(self, memory_id: str, importance: float):
        """更新记忆重要性"""
        if memory_id in self._memories:
            self._memories[memory_id].importance = importance

    def forget(self, memory_id: str) -> bool:
        """删除记忆"""
        if memory_id in self._memories:
            entry = self._memories[memory_id]
            del self._memories[memory_id]
            self._vector_store.delete(memory_id)
            self._update_stats()
            return True
        return False

    def forget_session(self, session_id: str):
        """删除会话所有记忆"""
        memory_ids = self._session_memories.get(session_id, [])
        for memory_id in memory_ids:
            self._memories.pop(memory_id, None)
            self._vector_store.delete(memory_id)
        self._session_memories.pop(session_id, None)
        self._update_stats()

    def _update_stats(self):
        """更新统计信息"""
        self._stats.total_count = len(self._memories)

        by_type: Dict[str, int] = {}
        total_importance = 0.0
        high_importance_count = 0
        total_accesses = 0

        for entry in self._memories.values():
            type_key = entry.memory_type.value
            by_type[type_key] = by_type.get(type_key, 0) + 1
            total_importance += entry.importance
            if entry.importance >= 0.7:
                high_importance_count += 1
            total_accesses += entry.access_count

        self._stats.by_type = by_type
        self._stats.avg_importance = (
            total_importance / len(self._memories)
            if self._memories else 0.0
        )
        self._stats.high_importance_count = high_importance_count
        self._stats.total_accesses = total_accesses

    def _check_capacity(self):
        """检查容量并清理低优先级记忆"""
        if len(self._memories) <= self.max_entries:
            return

        # 按重要性和访问时间排序
        entries = list(self._memories.items())
        entries.sort(key=lambda x: (
            x[1].importance,
            x[1].access_count,
            x[1].created_at
        ))

        # 删除最低优先级的记忆
        to_remove = len(self._memories) - self.max_entries
        for i in range(to_remove):
            memory_id, entry = entries[i]
            self._memories.pop(memory_id)
            self._vector_store.delete(memory_id)

    def cleanup_expired(self):
        """清理过期记忆"""
        expired_ids = [
            memory_id for memory_id, entry in self._memories.items()
            if entry.is_expired()
        ]

        for memory_id in expired_ids:
            self._memories.pop(memory_id, None)
            self._vector_store.delete(memory_id)

        self._update_stats()
        return len(expired_ids)

    def get_stats(self) -> MemoryStats:
        """获取统计信息"""
        return self._stats

    def export_memories(self, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """导出记忆"""
        if session_id:
            return [
                self._memories[mid].to_dict()
                for mid in self._session_memories.get(session_id, [])
                if mid in self._memories
            ]
        return [entry.to_dict() for entry in self._memories.values()]

    def import_memories(self, memories_data: List[Dict[str, Any]]):
        """导入记忆"""
        for data in memories_data:
            memory_type = MemoryType(data.get("memory_type", "semantic"))
            entry = MemoryEntry(
                id=data["id"],
                content=data["content"],
                memory_type=memory_type,
                importance=data.get("importance", 0.5),
                keywords=data.get("keywords", []),
                metadata=data.get("metadata", {})
            )
            self._memories[entry.id] = entry

            if entry.embedding:
                self._vector_store.add(
                    id=entry.id,
                    vector=entry.embedding,
                    metadata={
                        "memory_type": memory_type.value,
                        "session_id": entry.metadata.get("session_id"),
                        "importance": entry.importance
                    }
                )

        self._update_stats()
