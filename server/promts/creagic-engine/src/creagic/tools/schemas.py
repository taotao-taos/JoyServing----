"""
工具定义和参数模式
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from enum import Enum


class ParameterType(str, Enum):
    """参数类型"""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


class ParameterRequired(str, Enum):
    """参数是否必需"""
    REQUIRED = "required"
    OPTIONAL = "optional"


@dataclass
class ParameterSchema:
    """参数模式定义"""
    name: str
    type: ParameterType
    description: str = ""
    required: ParameterRequired = ParameterRequired.OPTIONAL
    default: Any = None
    enum: Optional[List[Any]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    items: Optional["ParameterSchema"] = None
    properties: Optional[Dict[str, "ParameterSchema"]] = None

    def to_openai_schema(self) -> Dict[str, Any]:
        """转换为 OpenAI 函数调用格式"""
        schema = {
            "type": self.type.value,
            "description": self.description
        }

        if self.enum:
            schema["enum"] = self.enum

        if self.type == ParameterType.NUMBER or self.type == ParameterType.INTEGER:
            if self.min_value is not None:
                schema["minimum"] = self.min_value
            if self.max_value is not None:
                schema["maximum"] = self.max_value

        if self.type == ParameterType.STRING and self.pattern:
            schema["pattern"] = self.pattern

        if self.type == ParameterType.ARRAY and self.items:
            schema["items"] = self.items.to_openai_schema()

        if self.type == ParameterType.OBJECT and self.properties:
            schema["properties"] = {
                k: v.to_openai_schema()
                for k, v in self.properties.items()
            }

        return schema


@dataclass
class ToolDefinition:
    """
    工具定义

    Attributes:
        name: 工具名称 (唯一标识)
        description: 工具描述 (会被发送给 LLM)
        parameters: 参数模式列表
        returns: 返回值描述
        category: 工具类别 (用于分类组织)
        tags: 标签列表
        requires_approval: 是否需要审批
        timeout: 超时时间 (秒)
        retry_count: 重试次数
        examples: 使用示例
    """
    name: str
    description: str
    parameters: List[ParameterSchema] = field(default_factory=list)
    returns: str = ""
    category: str = "general"
    tags: List[str] = field(default_factory=list)
    requires_approval: bool = False
    timeout: int = 30
    retry_count: int = 3
    examples: List[str] = field(default_factory=list)
    enabled: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": {
                    p.name: p.to_openai_schema()
                    for p in self.parameters
                },
                "required": [
                    p.name for p in self.parameters
                    if p.required == ParameterRequired.REQUIRED
                ]
            }
        }

    def to_openai_function(self) -> Dict[str, Any]:
        """转换为 OpenAI 函数定义"""
        return self.to_dict()

    def validate_parameters(self, params: Dict[str, Any]) -> tuple[bool, str]:
        """
        验证参数

        Returns:
            (是否有效, 错误信息)
        """
        # 检查必需参数
        for param in self.parameters:
            if param.required == ParameterRequired.REQUIRED:
                if param.name not in params:
                    return False, f"缺少必需参数: {param.name}"

        # 检查每个参数
        for name, value in params.items():
            param_def = next((p for p in self.parameters if p.name == name), None)
            if not param_def:
                continue

            # 类型检查
            expected_type = param_def.type.value
            actual_type = type(value).__name__

            type_mapping = {
                "string": str,
                "number": (int, float),
                "integer": int,
                "boolean": bool,
                "array": list,
                "object": dict
            }

            expected_python_type = type_mapping.get(expected_type)
            if expected_python_type and not isinstance(value, expected_python_type):
                return False, f"参数 {name} 类型错误: 期望 {expected_type}, 实际 {actual_type}"

            # 枚举检查
            if param_def.enum and value not in param_def.enum:
                return False, f"参数 {name} 值不在允许范围内: {param_def.enum}"

            # 范围检查
            if expected_type in ["number", "integer"]:
                if param_def.min_value is not None and value < param_def.min_value:
                    return False, f"参数 {name} 小于最小值: {param_def.min_value}"
                if param_def.max_value is not None and value > param_def.max_value:
                    return False, f"参数 {name} 大于最大值: {param_def.max_value}"

        return True, ""


def create_tool(
    name: str,
    description: str,
    parameters: List[Dict[str, Any]],
    category: str = "general",
    **kwargs
) -> ToolDefinition:
    """
    工具定义工厂函数

    简化工具创建流程
    """
    param_schemas = []
    for p in parameters:
        param_schemas.append(ParameterSchema(
            name=p["name"],
            type=ParameterType(p.get("type", "string")),
            description=p.get("description", ""),
            required=ParameterRequired(p.get("required", "optional")),
            default=p.get("default"),
            enum=p.get("enum"),
            min_value=p.get("min"),
            max_value=p.get("max")
        ))

    return ToolDefinition(
        name=name,
        description=description,
        parameters=param_schemas,
        category=category,
        **kwargs
    )
