"""
工具注册表

管理所有可用工具的注册和查询
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
import json

from .schemas import (
    ToolDefinition,
    ParameterType,
    ParameterRequired,
    ParameterSchema,
)


@dataclass
class ToolCall:
    """
    工具调用记录

    Attributes:
        id: 调用 ID
        tool_name: 工具名称
        arguments: 调用参数
        result: 执行结果
        status: 调用状态
        started_at: 开始时间
        completed_at: 完成时间
        error: 错误信息
    """
    id: str
    tool_name: str
    arguments: Dict[str, Any]
    result: Any = None
    status: str = "pending"  # pending, running, success, failed
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    execution_time: float = 0.0

    def mark_running(self):
        self.status = "running"

    def mark_success(self, result: Any):
        self.status = "success"
        self.result = result
        self.completed_at = datetime.now()
        self.execution_time = (self.completed_at - self.started_at).total_seconds()

    def mark_failed(self, error: str):
        self.status = "failed"
        self.error = error
        self.completed_at = datetime.now()
        self.execution_time = (self.completed_at - self.started_at).total_seconds()


@dataclass
class ToolResult:
    """工具执行结果"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    tool_call: Optional[ToolCall] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class ToolRegistry:
    """
    工具注册表

    功能:
    - 注册和取消注册工具
    - 按类别和标签查询工具
    - 生成工具定义供 LLM 使用
    - 工具使用统计
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._implementations: Dict[str, Callable] = {}
        self._usage_stats: Dict[str, Dict[str, Any]] = {}
        self._call_history: List[ToolCall] = []
        self._max_history = 1000

    def register(
        self,
        tool_def: ToolDefinition,
        implementation: Callable,
        overwrite: bool = False
    ) -> bool:
        """
        注册工具

        Args:
            tool_def: 工具定义
            implementation: 工具实现函数
            overwrite: 是否覆盖已存在的工具

        Returns:
            是否注册成功
        """
        if tool_def.name in self._tools and not overwrite:
            return False

        self._tools[tool_def.name] = tool_def
        self._implementations[tool_def.name] = implementation
        self._usage_stats[tool_def.name] = {
            "total_calls": 0,
            "successful_calls": 0,
            "failed_calls": 0,
            "total_execution_time": 0.0
        }

        return True

    def unregister(self, name: str) -> bool:
        """取消注册工具"""
        if name in self._tools:
            del self._tools[name]
            del self._implementations[name]
            return True
        return False

    def get(self, name: str) -> Optional[ToolDefinition]:
        """获取工具定义"""
        return self._tools.get(name)

    def get_implementation(self, name: str) -> Optional[Callable]:
        """获取工具实现"""
        return self._implementations.get(name)

    def list_tools(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        enabled_only: bool = True
    ) -> List[ToolDefinition]:
        """
        列出工具

        Args:
            category: 类别过滤
            tags: 标签过滤
            enabled_only: 只返回启用的工具

        Returns:
            工具列表
        """
        tools = list(self._tools.values())

        if enabled_only:
            tools = [t for t in tools if t.enabled]

        if category:
            tools = [t for t in tools if t.category == category]

        if tags:
            tools = [
                t for t in tools
                if any(tag in t.tags for tag in tags)
            ]

        return tools

    def list_categories(self) -> List[str]:
        """列出所有类别"""
        categories = set()
        for tool in self._tools.values():
            categories.add(tool.category)
        return sorted(list(categories))

    def generate_definitions(self, format: str = "openai") -> List[Dict[str, Any]]:
        """
        生成工具定义列表

        Args:
            format: 输出格式 (openai, anthropic, etc.)

        Returns:
            工具定义列表
        """
        tools = self.list_tools()

        if format == "openai":
            return [tool.to_openai_function() for tool in tools]
        elif format == "anthropic":
            # Anthropic 格式
            return [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            p.name: p.to_openai_schema()
                            for p in tool.parameters
                        },
                        "required": [
                            p.name for p in tool.parameters
                            if p.required == ParameterRequired.REQUIRED
                        ]
                    }
                }
                for tool in tools
            ]
        else:
            return [tool.to_dict() for tool in tools]

    def record_call(self, call: ToolCall):
        """记录工具调用"""
        self._call_history.append(call)

        # 限制历史记录数量
        if len(self._call_history) > self._max_history:
            self._call_history = self._call_history[-self._max_history:]

        # 更新统计
        if call.tool_name in self._usage_stats:
            stats = self._usage_stats[call.tool_name]
            stats["total_calls"] += 1
            if call.status == "success":
                stats["successful_calls"] += 1
            else:
                stats["failed_calls"] += 1
            stats["total_execution_time"] += call.execution_time

    def get_usage_stats(self, tool_name: Optional[str] = None) -> Dict[str, Any]:
        """获取使用统计"""
        if tool_name:
            return self._usage_stats.get(tool_name, {})
        return {
            "tools": self._usage_stats, "total_calls": len(self._call_history)
        }

    def get_call_history(
        self,
        tool_name: Optional[str] = None,
        limit: int = 100
    ) -> List[ToolCall]:
        """获取调用历史"""
        history = self._call_history

        if tool_name:
            history = [c for c in history if c.tool_name == tool_name]

        return history[-limit:]

    def __len__(self) -> int:
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        return name in self._tools


# 预定义的设计相关工具

def get_design_tools() -> List[ToolDefinition]:
    """获取 Creagic 设计助手预设工具"""
    return [
        ToolDefinition(
            name="generate_image",
            description="根据文本描述生成图片。使用此工具可以创建海报、封面、插图等视觉内容。",
            parameters=[
                ParameterSchema(
                    name="prompt",
                    type=ParameterType.STRING,
                    description="图片生成提示词，描述要生成的图片内容、风格、颜色等",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="style",
                    type=ParameterType.STRING,
                    description="艺术风格，如: realistic, anime, watercolor, minimalist, vintage",
                    required=ParameterRequired.OPTIONAL,
                    default="modern"
                ),
                ParameterSchema(
                    name="size",
                    type=ParameterType.STRING,
                    description="图片尺寸，如: 1024x1024, 1920x1080, 1080x1920",
                    required=ParameterRequired.OPTIONAL,
                    default="1024x1024"
                ),
                ParameterSchema(
                    name="quality",
                    type=ParameterType.STRING,
                    description="图片质量: standard, hd",
                    required=ParameterRequired.OPTIONAL,
                    default="standard"
                )
            ],
            category="design",
            tags=["image", "generation", "creative"],
            returns="生成图片的 URL"
        ),
        ToolDefinition(
            name="edit_image",
            description="编辑现有图片，可以修改局部区域、扩展画面、移除物体等。",
            parameters=[
                ParameterSchema(
                    name="image_url",
                    type=ParameterType.STRING,
                    description="要编辑的图片 URL",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="instruction",
                    type=ParameterType.STRING,
                    description="编辑指令，描述要如何修改图片",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="mask_url",
                    type=ParameterType.STRING,
                    description="蒙版图片 URL，标识要编辑的区域 (可选)",
                    required=ParameterRequired.OPTIONAL
                )
            ],
            category="design",
            tags=["image", "editing", "modification"],
            returns="编辑后图片的 URL"
        ),
        ToolDefinition(
            name="variate_image",
            description="基于原图生成多个变体，保持主体但改变风格、构图或细节。",
            parameters=[
                ParameterSchema(
                    name="image_url",
                    type=ParameterType.STRING,
                    description="原始图片 URL",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="variation_count",
                    type=ParameterType.INTEGER,
                    description="生成变体数量",
                    required=ParameterRequired.OPTIONAL,
                    default=4,
                    min_value=1,
                    max_value=9
                )
            ],
            category="design",
            tags=["image", "variation", "variants"],
            returns="变体图片 URL 列表"
        ),
        ToolDefinition(
            name="search_inspiration",
            description="搜索设计灵感和参考图片",
            parameters=[
                ParameterSchema(
                    name="query",
                    type=ParameterType.STRING,
                    description="搜索关键词",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="category",
                    type=ParameterType.STRING,
                    description="类别: poster, brand, ui, illustration, photography",
                    required=ParameterRequired.OPTIONAL,
                    default="general"
                ),
                ParameterSchema(
                    name="limit",
                    type=ParameterType.INTEGER,
                    description="返回结果数量",
                    required=ParameterRequired.OPTIONAL,
                    default=10
                )
            ],
            category="research",
            tags=["search", "inspiration", "reference"],
            returns="参考图片列表"
        ),
        ToolDefinition(
            name="check_quality",
            description="检查设计作品的品质，包括构图、色彩、品牌一致性等",
            parameters=[
                ParameterSchema(
                    name="image_url",
                    type=ParameterType.STRING,
                    description="要检查的图片 URL",
                    required=ParameterRequired.REQUIRED
                ),
                ParameterSchema(
                    name="check_types",
                    type=ParameterType.ARRAY,
                    description="检查类型列表: composition, color, brand, consistency, accessibility",
                    required=ParameterRequired.REQUIRED,
                    items=ParameterSchema(
                        name="type",
                        type=ParameterType.STRING,
                        description="检查类型"
                    )
                ),
                ParameterSchema(
                    name="brand_guidelines",
                    type=ParameterType.OBJECT,
                    description="品牌规范配置",
                    required=ParameterRequired.OPTIONAL,
                    properties={
                        "colors": ParameterSchema(
                            name="colors",
                            type=ParameterType.ARRAY,
                            description="品牌主色调"
                        ),
                        "fonts": ParameterSchema(
                            name="fonts",
                            type=ParameterType.ARRAY,
                            description="品牌字体"
                        ),
                        "styles": ParameterSchema(
                            name="styles",
                            type=ParameterType.ARRAY,
                            description="品牌风格关键词"
                        )
                    }
                )
            ],
            category="validation",
            tags=["quality", "check", "audit"],
            returns="质量检查报告"
        )
    ]
