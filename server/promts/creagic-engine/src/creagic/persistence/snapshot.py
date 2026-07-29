"""
快照管理器

提供系统状态的即时快照功能
"""

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from pathlib import Path

from .session import SessionStore


@dataclass
class Snapshot:
    """
    系统快照

    Attributes:
        id: 快照 ID
        name: 快照名称
        description: 快照描述
        timestamp: 创建时间
        data: 快照数据
        tags: 标签
        parent_id: 父快照 ID (用于版本追踪)
    """
    id: str
    name: str
    description: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    data: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    parent_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "timestamp": self.timestamp,
            "data": self.data,
            "tags": self.tags,
            "parent_id": self.parent_id,
            "metadata": self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Snapshot":
        """从字典创建"""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            timestamp=data.get("timestamp", datetime.now().isoformat()),
            data=data.get("data", {}),
            tags=data.get("tags", []),
            parent_id=data.get("parent_id"),
            metadata=data.get("metadata", {})
        )


class SnapshotManager:
    """
    快照管理器

    功能:
    - 创建系统状态快照
    - 快照版本追踪
    - 快照比较
    - 快照恢复
    - 快照导出/导入
    """

    def __init__(
        self,
        storage_path: str = "./data/snapshots",
        max_snapshots: int = 100
    ):
        """
        初始化快照管理器

        Args:
            storage_path: 存储路径
            max_snapshots: 最大快照数量
        """
        self.storage_path = Path(storage_path)
        self.max_snapshots = max_snapshots

        self._snapshots: Dict[str, Snapshot] = {}
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # 加载已有快照
        self._load_snapshots()

    def _load_snapshots(self):
        """加载已有快照"""
        for file_path in self.storage_path.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    snapshot = Snapshot.from_dict(data)
                    self._snapshots[snapshot.id] = snapshot
            except Exception:
                pass

    def create(
        self,
        name: str,
        data: Dict[str, Any],
        description: str = "",
        tags: Optional[List[str]] = None,
        parent_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Snapshot:
        """
        创建快照

        Args:
            name: 快照名称
            data: 快照数据
            description: 描述
            tags: 标签
            parent_id: 父快照 ID
            metadata: 附加元数据

        Returns:
            创建的快照
        """
        snapshot_id = str(uuid.uuid4())

        snapshot = Snapshot(
            id=snapshot_id,
            name=name,
            description=description,
            data=data,
            tags=tags or [],
            parent_id=parent_id,
            metadata=metadata or {}
        )

        self._snapshots[snapshot_id] = snapshot

        # 保存到磁盘
        self._save_snapshot(snapshot)

        # 清理旧快照
        self._cleanup_old_snapshots()

        return snapshot

    def _save_snapshot(self, snapshot: Snapshot):
        """保存快照到磁盘"""
        file_path = self.storage_path / f"{snapshot.id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(snapshot.to_dict(), f, ensure_ascii=False, indent=2)

    def get(self, snapshot_id: str) -> Optional[Snapshot]:
        """获取快照"""
        return self._snapshots.get(snapshot_id)

    def delete(self, snapshot_id: str) -> bool:
        """删除快照"""
        if snapshot_id in self._snapshots:
            del self._snapshots[snapshot_id]

            file_path = self.storage_path / f"{snapshot_id}.json"
            if file_path.exists():
                file_path.unlink()

            return True
        return False

    def list(
        self,
        tags: Optional[List[str]] = None,
        name_contains: Optional[str] = None,
        limit: int = 100
    ) -> List[Snapshot]:
        """
        列出快照

        Args:
            tags: 标签过滤
            name_contains: 名称包含关键词
            limit: 返回数量限制

        Returns:
            快照列表
        """
        snapshots = list(self._snapshots.values())

        if tags:
            snapshots = [
                s for s in snapshots
                if any(tag in s.tags for tag in tags)
            ]

        if name_contains:
            snapshots = [
                s for s in snapshots
                if name_contains.lower() in s.name.lower()
            ]

        # 按时间排序
        snapshots.sort(key=lambda s: s.timestamp, reverse=True)

        return snapshots[:limit]

    def find_latest(self, tag: Optional[str] = None) -> Optional[Snapshot]:
        """获取最新的快照"""
        snapshots = self.list(tags=[tag] if tag else None, limit=1)
        return snapshots[0] if snapshots else None

    def compare(
        self,
        snapshot_id1: str,
        snapshot_id2: str
    ) -> Optional[Dict[str, Any]]:
        """
        比较两个快照

        Returns:
            差异信息
        """
        s1 = self.get(snapshot_id1)
        s2 = self.get(snapshot_id2)

        if not s1 or not s2:
            return None

        diff = {
            "snapshot1": {"id": s1.id, "name": s1.name, "timestamp": s1.timestamp},
            "snapshot2": {"id": s2.id, "name": s2.name, "timestamp": s2.timestamp},
            "changes": self._compute_diff(s1.data, s2.data)
        }

        return diff

    def _compute_diff(
        self,
        data1: Dict[str, Any],
        data2: Dict[str, Any],
        path: str = ""
    ) -> List[Dict[str, Any]]:
        """计算数据差异"""
        changes = []

        all_keys = set(data1.keys()) | set(data2.keys())

        for key in all_keys:
            current_path = f"{path}.{key}" if path else key
            v1 = data1.get(key)
            v2 = data2.get(key)

            if v1 != v2:
                if isinstance(v1, dict) and isinstance(v2, dict):
                    changes.extend(self._compute_diff(v1, v2, current_path))
                else:
                    changes.append({
                        "path": current_path,
                        "type": "modified",
                        "old_value": v1,
                        "new_value": v2
                    })

        return changes

    def get_version_history(self, start_snapshot_id: str) -> List[Snapshot]:
        """获取版本历史"""
        history = []
        current = self.get(start_snapshot_id)

        while current:
            history.append(current)
            current = self.get(current.parent_id) if current.parent_id else None

        return history

    def export_snapshot(self, snapshot_id: str) -> Optional[str]:
        """导出快照为 JSON"""
        snapshot = self.get(snapshot_id)
        if snapshot:
            return json.dumps(snapshot.to_dict(), ensure_ascii=False, indent=2)
        return None

    def import_snapshot(self, json_data: str) -> Optional[Snapshot]:
        """从 JSON 导入快照"""
        try:
            data = json.loads(json_data)
            snapshot = Snapshot.from_dict(data)

            # 生成新 ID 以避免冲突
            snapshot.id = str(uuid.uuid4())

            self._snapshots[snapshot.id] = snapshot
            self._save_snapshot(snapshot)

            return snapshot
        except Exception:
            return None

    def tag_snapshot(self, snapshot_id: str, tag: str):
        """为快照添加标签"""
        snapshot = self.get(snapshot_id)
        if snapshot and tag not in snapshot.tags:
            snapshot.tags.append(tag)
            self._save_snapshot(snapshot)

    def untag_snapshot(self, snapshot_id: str, tag: str):
        """移除快照标签"""
        snapshot = self.get(snapshot_id)
        if snapshot and tag in snapshot.tags:
            snapshot.tags.remove(tag)
            self._save_snapshot(snapshot)

    def _cleanup_old_snapshots(self):
        """清理旧快照"""
        if len(self._snapshots) > self.max_snapshots:
            # 按时间排序，删除最旧的
            sorted_snapshots = sorted(
                self._snapshots.values(),
                key=lambda s: s.timestamp
            )

            to_delete = sorted_snapshots[:len(self._snapshots) - self.max_snapshots]
            for snapshot in to_delete:
                self.delete(snapshot.id)

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        snapshots = list(self._snapshots.values())

        all_tags = set()
        for s in snapshots:
            all_tags.update(s.tags)

        return {
            "total_snapshots": len(snapshots),
            "max_snapshots": self.max_snapshots,
            "storage_path": str(self.storage_path),
            "unique_tags": len(all_tags),
            "tags": list(all_tags)
        }


# 便捷函数

def create_quick_snapshot(
    session_store: SessionStore,
    session_id: str,
    name: Optional[str] = None
) -> Optional[Snapshot]:
    """快速创建会话快照"""
    session = session_store.get(session_id)
    if not session:
        return None

    manager = SnapshotManager()

    snapshot_name = name or f"Session_{session_id[:8]}_{datetime.now().strftime('%Y%m%d')}"

    return manager.create(
        name=snapshot_name,
        data=session.to_dict(),
        tags=["session", "auto"],
        metadata={"session_id": session_id}
    )
