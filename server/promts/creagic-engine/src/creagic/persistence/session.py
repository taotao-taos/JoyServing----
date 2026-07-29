"""
会话存储

管理和持久化会话状态
"""

import json
import os
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional
import sqlite3
import threading


class SessionStatus(str, Enum):
    """会话状态"""
    ACTIVE = "active"
    IDLE = "idle"
    COMPLETED = "completed"
    EXPIRED = "expired"


@dataclass
class SessionState:
    """
    会话状态快照

    Attributes:
        session_id: 会话 ID
        user_id: 用户 ID
        status: 会话状态
        messages: 消息历史
        context: 上下文数据
        memory_ids: 关联的记忆 ID
        metadata: 附加元数据
        created_at: 创建时间
        updated_at: 更新时间
        last_active_at: 最后活跃时间
    """
    session_id: str
    user_id: str
    status: SessionStatus = SessionStatus.ACTIVE
    messages: List[Dict[str, Any]] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    memory_ids: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_active_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """添加消息"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })
        self.updated_at = datetime.now().isoformat()
        self.last_active_at = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "status": self.status.value,
            "messages": self.messages,
            "context": self.context,
            "memory_ids": self.memory_ids,
            "metadata": self.metadata,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_active_at": self.last_active_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SessionState":
        """从字典创建"""
        return cls(
            session_id=data["session_id"],
            user_id=data["user_id"],
            status=SessionStatus(data.get("status", "active")),
            messages=data.get("messages", []),
            context=data.get("context", {}),
            memory_ids=data.get("memory_ids", []),
            metadata=data.get("metadata", {}),
            created_at=data.get("created_at", datetime.now().isoformat()),
            updated_at=data.get("updated_at", datetime.now().isoformat()),
            last_active_at=data.get("last_active_at", datetime.now().isoformat())
        )


class SessionStore:
    """
    会话存储

    支持多种存储后端:
    - 内存 (默认)
    - SQLite
    - 文件系统
    - 自定义后端
    """

    def __init__(
        self,
        storage_type: str = "memory",
        storage_path: str = "./data/sessions",
        db_path: Optional[str] = None
    ):
        """
        初始化会话存储

        Args:
            storage_type: 存储类型 (memory, sqlite, file)
            storage_path: 存储路径
            db_path: 数据库路径
        """
        self.storage_type = storage_type
        self.storage_path = Path(storage_path)
        self.db_path = db_path or str(self.storage_path / "sessions.db")

        self._sessions: Dict[str, SessionState] = {}
        self._lock = threading.RLock()

        # 初始化存储
        if storage_type == "sqlite":
            self._init_sqlite()
        elif storage_type == "file":
            self.storage_path.mkdir(parents=True, exist_ok=True)

        # 自动保存配置
        self._auto_save = True
        self._auto_save_interval = 60  # 秒

    def _init_sqlite(self):
        """初始化 SQLite 数据库"""
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_active_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_id ON sessions(user_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_updated_at ON sessions(updated_at)
        """)

        conn.commit()
        conn.close()

    def create(
        self,
        session_id: str,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SessionState:
        """
        创建新会话

        Args:
            session_id: 会话 ID
            user_id: 用户 ID
            metadata: 初始元数据

        Returns:
            创建的会话状态
        """
        with self._lock:
            if session_id in self._sessions:
                return self._sessions[session_id]

            session = SessionState(
                session_id=session_id,
                user_id=user_id,
                metadata=metadata or {}
            )

            self._sessions[session_id] = session

            if self.storage_type == "sqlite":
                self._save_to_sqlite(session)
            elif self.storage_type == "file":
                self._save_to_file(session)

            return session

    def get(self, session_id: str) -> Optional[SessionState]:
        """
        获取会话

        Args:
            session_id: 会话 ID

        Returns:
            会话状态或 None
        """
        with self._lock:
            # 内存优先
            if session_id in self._sessions:
                return self._sessions[session_id]

            # 从存储加载
            if self.storage_type == "sqlite":
                return self._load_from_sqlite(session_id)
            elif self.storage_type == "file":
                return self._load_from_file(session_id)

            return None

    def update(self, session: SessionState) -> bool:
        """
        更新会话

        Args:
            session: 会话状态

        Returns:
            是否更新成功
        """
        with self._lock:
            session.updated_at = datetime.now().isoformat()
            self._sessions[session.session_id] = session

            if self.storage_type == "sqlite":
                return self._save_to_sqlite(session)
            elif self.storage_type == "file":
                return self._save_to_file(session)

            return True

    def delete(self, session_id: str) -> bool:
        """删除会话"""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]

            if self.storage_type == "sqlite":
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
                conn.commit()
                conn.close()

            elif self.storage_type == "file":
                file_path = self.storage_path / f"{session_id}.json"
                if file_path.exists():
                    file_path.unlink()

            return True

    def list(
        self,
        user_id: Optional[str] = None,
        status: Optional[SessionStatus] = None,
        limit: int = 100
    ) -> List[SessionState]:
        """
        列出会话

        Args:
            user_id: 用户 ID 过滤
            status: 状态过滤
            limit: 返回数量限制

        Returns:
            会话列表
        """
        with self._lock:
            sessions = list(self._sessions.values())

            if user_id:
                sessions = [s for s in sessions if s.user_id == user_id]

            if status:
                sessions = [s for s in sessions if s.status == status]

            # 按更新时间排序
            sessions.sort(key=lambda s: s.updated_at, reverse=True)

            return sessions[:limit]

    def _save_to_sqlite(self, session: SessionState) -> bool:
        """保存到 SQLite"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT OR REPLACE INTO sessions
                (session_id, user_id, status, data, created_at, updated_at, last_active_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                session.session_id,
                session.user_id,
                session.status.value,
                json.dumps(session.to_dict(), ensure_ascii=False),
                session.created_at,
                session.updated_at,
                session.last_active_at
            ))

            conn.commit()
            conn.close()
            return True

        except Exception as e:
            print(f"SQLite 保存失败: {e}")
            return False

    def _load_from_sqlite(self, session_id: str) -> Optional[SessionState]:
        """从 SQLite 加载"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                "SELECT data FROM sessions WHERE session_id = ?",
                (session_id,)
            )

            row = cursor.fetchone()
            conn.close()

            if row:
                data = json.loads(row[0])
                session = SessionState.from_dict(data)
                self._sessions[session_id] = session
                return session

        except Exception as e:
            print(f"SQLite 加载失败: {e}")

        return None

    def _save_to_file(self, session: SessionState) -> bool:
        """保存到文件"""
        try:
            file_path = self.storage_path / f"{session.session_id}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(session.to_dict(), f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"文件保存失败: {e}")
            return False

    def _load_from_file(self, session_id: str) -> Optional[SessionState]:
        """从文件加载"""
        try:
            file_path = self.storage_path / f"{session_id}.json"
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                session = SessionState.from_dict(data)
                self._sessions[session_id] = session
                return session
        except Exception as e:
            print(f"文件加载失败: {e}")

        return None

    def cleanup_expired(self, max_idle_seconds: int = 3600) -> int:
        """
        清理过期会话

        Args:
            max_idle_seconds: 最大空闲秒数

        Returns:
            清理的会话数量
        """
        with self._lock:
            expired_ids = []
            now = datetime.now()

            for session in self._sessions.values():
                last_active = datetime.fromisoformat(session.last_active_at)
                idle_seconds = (now - last_active).total_seconds()

                if idle_seconds > max_idle_seconds:
                    expired_ids.append(session.session_id)

            for session_id in expired_ids:
                self.delete(session_id)

            return len(expired_ids)

    def export_session(self, session_id: str) -> Optional[str]:
        """导出会话为 JSON"""
        session = self.get(session_id)
        if session:
            return json.dumps(session.to_dict(), ensure_ascii=False, indent=2)
        return None

    def import_session(self, json_data: str) -> Optional[SessionState]:
        """从 JSON 导入会话"""
        try:
            data = json.loads(json_data)
            session = SessionState.from_dict(data)
            self._sessions[session.session_id] = session
            self.update(session)
            return session
        except Exception as e:
            print(f"导入失败: {e}")
            return None

    def get_stats(self) -> Dict[str, Any]:
        """获取存储统计"""
        with self._lock:
            total = len(self._sessions)
            by_status = {}

            for session in self._sessions.values():
                status = session.status.value
                by_status[status] = by_status.get(status, 0) + 1

            return {
                "storage_type": self.storage_type,
                "total_sessions": total,
                "by_status": by_status,
                "total_messages": sum(len(s.messages) for s in self._sessions.values())
            }
