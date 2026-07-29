"""
配置管理器
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import asdict


class ConfigManager:
    """
    统一配置管理器
    支持环境变量、配置文件、代码配置三层配置
    """

    DEFAULT_CONFIG = {
        "llm": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 4096,
            "api_key_env": "OPENAI_API_KEY"
        },
        "memory": {
            "max_entries": 1000,
            "importance_threshold": 0.3,
            "retention_days": 30,
            "embedding_model": "text-embedding-3-small"
        },
        "tools": {
            "timeout": 30,
            "retry_count": 3,
            "parallel_limit": 5
        },
        "planning": {
            "max_subtasks": 10,
            "decomposition_depth": 3,
            "execution_order": "sequential"  # sequential, parallel, priority
        },
        "validation": {
            "default_level": "normal",
            "auto_fix": True,
            "min_score": 70
        },
        "multi_agent": {
            "coordinator_model": "gpt-4o",
            "executor_model": "gpt-4o-mini",
            "max_agents": 5,
            "approval_required": True
        },
        "persistence": {
            "storage_path": "./data",
            "backup_enabled": True,
            "backup_interval": 3600  # 秒
        }
    }

    def __init__(self, config_path: Optional[str] = None):
        self._config = self.DEFAULT_CONFIG.copy()
        if config_path:
            self.load_from_file(config_path)
        self._load_from_env()

    def load_from_file(self, path: str):
        """从文件加载配置"""
        path = Path(path)
        if not path.exists():
            return

        with open(path, 'r', encoding='utf-8') as f:
            if path.suffix == '.json':
                file_config = json.load(f)
            elif path.suffix in ['.yaml', '.yml']:
                import yaml
                file_config = yaml.safe_load(f)
            else:
                raise ValueError(f"Unsupported config format: {path.suffix}")

        self._deep_merge(self._config, file_config)

    def _load_from_env(self):
        """从环境变量加载配置"""
        env_prefix = "CREAGIC_"

        # LLM 配置
        if api_key := os.getenv(f"{env_prefix}API_KEY"):
            self._config["llm"]["api_key"] = api_key

        if provider := os.getenv(f"{env_prefix}LLM_PROVIDER"):
            self._config["llm"]["provider"] = provider

        if model := os.getenv(f"{env_prefix}MODEL"):
            self._config["llm"]["model"] = model

        # 存储路径
        if storage_path := os.getenv(f"{env_prefix}STORAGE_PATH"):
            self._config["persistence"]["storage_path"] = storage_path

        # 验证级别
        if validation_level := os.getenv(f"{env_prefix}VALIDATION_LEVEL"):
            self._config["validation"]["default_level"] = validation_level

    def _deep_merge(self, base: Dict, update: Dict) -> Dict:
        """深度合并配置"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
        return base

    def get(self, key_path: str, default: Any = None) -> Any:
        """
        获取配置值，支持点号路径
        例如: get("llm.provider")
        """
        keys = key_path.split(".")
        value = self._config

        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default

        return value

    def set(self, key_path: str, value: Any):
        """设置配置值"""
        keys = key_path.split(".")
        config = self._config

        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]

        config[keys[-1]] = value

    def get_llm_config(self) -> Dict[str, Any]:
        """获取 LLM 配置"""
        llm_config = self._config["llm"].copy()
        # 从环境变量获取 API Key
        if "api_key_env" in llm_config:
            llm_config["api_key"] = os.getenv(llm_config.pop("api_key_env"), "")
        return llm_config

    def get_all(self) -> Dict[str, Any]:
        """获取所有配置"""
        return self._config.copy()

    def update(self, updates: Dict[str, Any]):
        """批量更新配置"""
        self._deep_merge(self._config, updates)

    def to_dict(self) -> Dict[str, Any]:
        """导出为字典"""
        return self._config.copy()

    def save(self, path: str):
        """保存配置到文件"""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(self._config, f, indent=2, ensure_ascii=False)
