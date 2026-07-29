"""
备份管理器

提供自动备份和恢复功能
"""

import json
import os
import shutil
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class BackupManager:
    """
    备份管理器

    功能:
    - 自动定时备份
    - 手动备份
    - 增量备份
    - 备份恢复
    - 备份清理
    """

    def __init__(
        self,
        backup_dir: str = "./data/backups",
        max_backups: int = 10,
        backup_interval: int = 3600,  # 秒
        incremental: bool = True
    ):
        """
        初始化备份管理器

        Args:
            backup_dir: 备份目录
            max_backups: 最大备份保留数量
            backup_interval: 备份间隔
            incremental: 是否启用增量备份
        """
        self.backup_dir = Path(backup_dir)
        self.max_backups = max_backups
        self.backup_interval = backup_interval
        self.incremental = incremental

        self._backup_sources: List[str] = []
        self._last_backup_time: Optional[datetime] = None
        self._backup_thread: Optional[threading.Thread] = None
        self._stop_backup = threading.Event()
        self._backup_callbacks: List[Callable] = []

        # 创建备份目录
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def add_source(self, source_path: str):
        """添加备份源"""
        if source_path not in self._backup_sources:
            self._backup_sources.append(source_path)

    def remove_source(self, source_path: str):
        """移除备份源"""
        if source_path in self._backup_sources:
            self._backup_sources.remove(source_path)

    def backup_now(self) -> Optional[str]:
        """
        立即执行备份

        Returns:
            备份路径或 None
        """
        if not self._backup_sources:
            logger.warning("没有配置备份源")
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}"

            if self.incremental:
                backup_path = self.backup_dir / backup_name
                backup_path.mkdir(exist_ok=True)
            else:
                backup_path = self.backup_dir / f"{backup_name}.zip"

            # 执行备份
            for source in self._backup_sources:
                source_path = Path(source)
                if not source_path.exists():
                    logger.warning(f"备份源不存在: {source}")
                    continue

                if self.incremental:
                    # 增量备份：复制文件
                    dest = backup_path / source_path.name
                    if source_path.is_dir():
                        shutil.copytree(source_path, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy2(source_path, dest)
                else:
                    # 全量备份：压缩
                    shutil.make_archive(
                        str(backup_path.with_suffix('')),
                        'zip',
                        root_dir=source_path.parent,
                        base_dir=source_path.name
                    )

            # 写入备份元数据
            metadata = {
                "timestamp": timestamp,
                "sources": self._backup_sources,
                "type": "incremental" if self.incremental else "full"
            }

            with open(backup_path / "backup_metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)

            self._last_backup_time = datetime.now()

            # 触发回调
            for callback in self._backup_callbacks:
                try:
                    callback(backup_path, metadata)
                except Exception as e:
                    logger.error(f"备份回调执行失败: {e}")

            # 清理旧备份
            self._cleanup_old_backups()

            logger.info(f"备份完成: {backup_path}")
            return str(backup_path)

        except Exception as e:
            logger.exception(f"备份失败: {e}")
            return None

    def restore(self, backup_path: str, target_dir: Optional[str] = None) -> bool:
        """
        恢复备份

        Args:
            backup_path: 备份路径
            target_dir: 恢复目标目录 (默认为原始位置)

        Returns:
            是否恢复成功
        """
        backup_path = Path(backup_path)

        if not backup_path.exists():
            logger.error(f"备份不存在: {backup_path}")
            return False

        try:
            # 读取元数据
            metadata_path = backup_path / "backup_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                sources = metadata.get("sources", [])
            else:
                sources = [backup_path.name]

            # 恢复文件
            for source in sources:
                if target_dir:
                    dest = Path(target_dir) / Path(source).name
                else:
                    dest = Path(source)

                if backup_path.is_dir():
                    src = backup_path / Path(source).name
                else:
                    src = backup_path

                if src.exists():
                    if src.is_dir():
                        shutil.copytree(src, dest, dirs_exist_ok=True)
                    else:
                        shutil.copy2(src, dest)

            logger.info(f"恢复完成: {backup_path} -> {dest}")
            return True

        except Exception as e:
            logger.exception(f"恢复失败: {e}")
            return False

    def list_backups(self) -> List[Dict[str, Any]]:
        """列出所有备份"""
        backups = []

        for item in self.backup_dir.iterdir():
            if item.is_dir() or item.suffix == '.zip':
                metadata_path = item / "backup_metadata.json"

                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                else:
                    metadata = {}

                stat = item.stat()

                backups.append({
                    "name": item.name,
                    "path": str(item),
                    "type": metadata.get("type", "unknown"),
                    "timestamp": metadata.get("timestamp", item.name),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })

        # 按时间排序
        backups.sort(key=lambda x: x["timestamp"], reverse=True)
        return backups

    def delete_backup(self, backup_name: str) -> bool:
        """删除备份"""
        backup_path = self.backup_dir / backup_name

        if not backup_path.exists():
            return False

        try:
            if backup_path.is_dir():
                shutil.rmtree(backup_path)
            else:
                backup_path.unlink()
            return True
        except Exception as e:
            logger.error(f"删除备份失败: {e}")
            return False

    def start_auto_backup(self):
        """启动自动备份"""
        if self._backup_thread and self._backup_thread.is_alive():
            return

        self._stop_backup.clear()
        self._backup_thread = threading.Thread(target=self._auto_backup_loop, daemon=True)
        self._backup_thread.start()
        logger.info("自动备份已启动")

    def stop_auto_backup(self):
        """停止自动备份"""
        self._stop_backup.set()
        if self._backup_thread:
            self._backup_thread.join(timeout=5)
        logger.info("自动备份已停止")

    def _auto_backup_loop(self):
        """自动备份循环"""
        while not self._stop_backup.is_set():
            self.backup_now()
            self._stop_backup.wait(self.backup_interval)

    def _cleanup_old_backups(self):
        """清理旧备份"""
        backups = self.list_backups()

        if len(backups) > self.max_backups:
            for backup in backups[self.max_backups:]:
                self.delete_backup(backup["name"])

    def on_backup_complete(self, callback: Callable):
        """注册备份完成回调"""
        self._backup_callbacks.append(callback)

    def get_stats(self) -> Dict[str, Any]:
        """获取备份统计"""
        backups = self.list_backups()
        total_size = sum(b["size"] for b in backups)

        return {
            "backup_dir": str(self.backup_dir),
            "total_backups": len(backups),
            "total_size": total_size,
            "max_backups": self.max_backups,
            "last_backup": self._last_backup_time.isoformat() if self._last_backup_time else None,
            "auto_backup_enabled": self._backup_thread is not None and self._backup_thread.is_alive()
        }
