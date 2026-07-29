"""
上下文窗口管理器

智能管理 LLM 上下文长度，优化 token 使用
"""

from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field


@dataclass
class ContextItem:
    """上下文项"""
    id: str
    content: str
    role: str
    tokens: int
    priority: int = 0  # 优先级，越高越不会被裁剪
    is_pinned: bool = False  # 是否固定，不会被裁剪
    metadata: Dict[str, Any] = field(default_factory=dict)


class ContextWindow:
    """
    上下文窗口管理器

    功能:
    - 自动估算 token 数量
    - 基于优先级和相关性进行智能裁剪
    - 支持固定重要消息
    - 追踪 token 使用统计
    """

    def __init__(
        self,
        max_tokens: int = 128000,
        system_prompt_tokens: int = 4000,
        reserve_tokens: int = 2000,
        token_estimator: Optional[Callable[[str], int]] = None
    ):
        """
        初始化上下文窗口

        Args:
            max_tokens: 最大 token 数量
            system_prompt_tokens: 系统提示预留 token
            reserve_tokens: 安全储备 token
            token_estimator: 自定义 token 估算函数
        """
        self.max_tokens = max_tokens
        self.system_prompt_tokens = system_prompt_tokens
        self.reserve_tokens = reserve_tokens
        self.token_estimator = token_estimator or self._estimate_tokens

        self._items: List[ContextItem] = []
        self._total_tokens = 0
        self._usage_stats = {
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_requests": 0
        }

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """
        简单估算 token 数量

        粗略估计: 中文约 2 字符/token, 英文约 4 字符/token
        """
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        other_chars = len(text) - chinese_chars
        return int(chinese_chars / 2 + other_chars / 4)

    def add(
        self,
        id: str,
        content: str,
        role: str = "user",
        priority: int = 0,
        is_pinned: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        添加上下文项

        Args:
            id: 唯一标识
            content: 内容
            role: 角色
            priority: 优先级
            is_pinned: 是否固定
            metadata: 元数据
        """
        tokens = self.token_estimator(content)

        item = ContextItem(
            id=id,
            content=content,
            role=role,
            tokens=tokens,
            priority=priority,
            is_pinned=is_pinned,
            metadata=metadata or {}
        )

        self._items.append(item)
        self._total_tokens += tokens

        # 如果超出限制，进行裁剪
        if self._total_tokens > self.available_tokens:
            self._trim()

    def update(self, id: str, content: str):
        """更新上下文项内容"""
        for i, item in enumerate(self._items):
            if item.id == id:
                old_tokens = item.tokens
                new_tokens = self.token_estimator(content)

                item.content = content
                item.tokens = new_tokens
                self._total_tokens += (new_tokens - old_tokens)

                if self._total_tokens > self.available_tokens:
                    self._trim()
                break

    def remove(self, id: str) -> bool:
        """移除上下文项"""
        for i, item in enumerate(self._items):
            if item.id == id:
                self._total_tokens -= item.tokens
                self._items.pop(i)
                return True
        return False

    def pin(self, id: str, pinned: bool = True):
        """设置固定状态"""
        for item in self._items:
            if item.id == id:
                item.is_pinned = pinned
                break

    def get(self, id: str) -> Optional[ContextItem]:
        """获取上下文项"""
        for item in self._items:
            if item.id == id:
                return item
        return None

    def get_all(self) -> List[ContextItem]:
        """获取所有上下文项"""
        return self._items.copy()

    def clear(self, role: Optional[str] = None):
        """清空上下文"""
        if role is None:
            self._items = []
            self._total_tokens = 0
        else:
            items_to_remove = [item for item in self._items if item.role == role]
            for item in items_to_remove:
                self._total_tokens -= item.tokens
            self._items = [item for item in self._items if item.role != role]

    def _trim(self):
        """裁剪上下文以适应限制"""
        available = self.available_tokens

        if available <= 0:
            # 只保留固定项
            pinned_items = [item for item in self._items if item.is_pinned]
            self._items = pinned_items
            self._total_tokens = sum(item.tokens for item in pinned_items)
            return

        # 按优先级和创建顺序排序
        def sort_key(item: ContextItem):
            return (
                -item.is_pinned,  # 固定项优先
                -item.priority,
                item.metadata.get("created_at", 0)  # 较早的先删除
            )

        self._items.sort(key=sort_key)

        # 移除最低优先级的项直到满足限制
        while self._total_tokens > available and len(self._items) > 0:
            # 找到可删除的最低优先级项
            for i in range(len(self._items) - 1, -1, -1):
                if not self._items[i].is_pinned:
                    removed = self._items.pop(i)
                    self._total_tokens -= removed.tokens
                    break
            else:
                break

    @property
    def available_tokens(self) -> int:
        """可用 token 数量"""
        return self.max_tokens - self.system_prompt_tokens - self.reserve_tokens

    @property
    def used_tokens(self) -> int:
        """已使用 token 数量"""
        return self._total_tokens

    @property
    def usage_ratio(self) -> float:
        """使用比例"""
        return self._total_tokens / self.max_tokens if self.max_tokens > 0 else 0

    def build_messages(self) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []
        for item in self._items:
            messages.append({
                "role": item.role,
                "content": item.content
            })
        return messages

    def record_usage(self, input_tokens: int, output_tokens: int):
        """记录使用统计"""
        self._usage_stats["total_input_tokens"] += input_tokens
        self._usage_stats["total_output_tokens"] += output_tokens
        self._usage_stats["total_requests"] += 1

    def get_usage_stats(self) -> Dict[str, Any]:
        """获取使用统计"""
        return self._usage_stats.copy()

    def __len__(self) -> int:
        return len(self._items)

    def __repr__(self) -> str:
        return f"ContextWindow(items={len(self._items)}, tokens={self._total_tokens}/{self.max_tokens})"
