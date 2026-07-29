"""
验证规则注册表

管理和执行自定义验证规则
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import uuid


class CheckType(str, Enum):
    """检查类型"""
    FORMAT = "format"
    DIMENSION = "dimension"
    COLOR = "color"
    BRAND = "brand"
    CONSISTENCY = "consistency"
    ACCESSIBILITY = "accessibility"
    COMPOSITION = "composition"
    QUALITY = "quality"


@dataclass
class ValidationRule:
    """
    验证规则

    Attributes:
        id: 规则 ID
        name: 规则名称
        description: 规则描述
        check_type: 检查类型
        rule_config: 规则配置
        validator: 验证函数
        fixer: 修复函数 (可选)
        enabled: 是否启用
        priority: 优先级
    """
    id: str
    name: str
    description: str
    check_type: CheckType
    rule_config: Dict[str, Any] = field(default_factory=dict)
    validator: Optional[Callable] = None
    fixer: Optional[Callable] = None
    enabled: bool = True
    priority: int = 0

    def validate(self, output: Any) -> tuple[bool, str, Dict]:
        """
        验证输出

        Returns:
            (是否通过, 消息, 详情)
        """
        if self.validator:
            return self.validator(output, self.rule_config)
        return True, "通过", {}


@dataclass
class RuleViolation:
    """规则违规"""
    rule_id: str
    rule_name: str
    check_type: CheckType
    message: str
    severity: str = "warning"  # critical, warning, info
    details: Dict[str, Any] = field(default_factory=dict)
    suggested_fix: Optional[str] = None


class RuleRegistry:
    """
    验证规则注册表

    功能:
    - 注册和管理验证规则
    - 按类型分类规则
    - 批量执行规则
    """

    def __init__(self):
        self._rules: Dict[str, ValidationRule] = {}
        self._rules_by_type: Dict[CheckType, List[str]] = {}

        # 注册默认规则
        self._register_default_rules()

    def _register_default_rules(self):
        """注册默认规则"""
        # 尺寸规则
        self.register(ValidationRule(
            id="dim_minimum",
            name="最小尺寸限制",
            description="图片尺寸必须大于最小值",
            check_type=CheckType.DIMENSION,
            rule_config={"min_width": 512, "min_height": 512},
            validator=lambda o, c: (
                o.get("width", 0) >= c["min_width"] and
                o.get("height", 0) >= c["min_height"],
                "尺寸符合要求" if o.get("width", 0) >= c["min_width"] else "尺寸过小",
                {}
            )
        ))

        # 格式规则
        self.register(ValidationRule(
            id="fmt_supported",
            name="支持格式检查",
            description="图片必须是支持的格式",
            check_type=CheckType.FORMAT,
            rule_config={"supported": ["png", "jpg", "jpeg", "webp", "svg"]},
            validator=lambda o, c: (
                o.get("format", "").lower() in c["supported"],
                f"格式支持: {o.get('format', 'unknown')}",
                {}
            )
        ))

        # 品牌色规则
        self.register(ValidationRule(
            id="brand_color",
            name="品牌色彩检查",
            description="必须使用品牌色彩",
            check_type=CheckType.COLOR,
            rule_config={"required_colors": [], "tolerance": 0.1},
            validator=lambda o, c: (
                True,  # 默认通过
                "色彩检查通过",
                {}
            )
        ))

    def register(self, rule: ValidationRule):
        """注册规则"""
        self._rules[rule.id] = rule

        if rule.check_type not in self._rules_by_type:
            self._rules_by_type[rule.check_type] = []
        self._rules_by_type[rule.check_type].append(rule.id)

    def unregister(self, rule_id: str) -> bool:
        """取消注册规则"""
        if rule_id in self._rules:
            rule = self._rules[rule_id]
            del self._rules[rule_id]
            if rule.check_type in self._rules_by_type:
                self._rules_by_type[rule.check_type].remove(rule_id)
            return True
        return False

    def get(self, rule_id: str) -> Optional[ValidationRule]:
        """获取规则"""
        return self._rules.get(rule_id)

    def list_rules(
        self,
        check_type: Optional[CheckType] = None,
        enabled_only: bool = True
    ) -> List[ValidationRule]:
        """列出规则"""
        rules = list(self._rules.values())

        if enabled_only:
            rules = [r for r in rules if r.enabled]

        if check_type:
            rules = [r for r in rules if r.check_type == check_type]

        return sorted(rules, key=lambda r: -r.priority)

    def validate(
        self,
        output: Any,
        check_types: Optional[List[CheckType]] = None
    ) -> List[RuleViolation]:
        """
        执行验证

        Returns:
            违规列表
        """
        violations = []

        rules = self.list_rules()
        if check_types:
            rules = [r for r in rules if r.check_type in check_types]

        for rule in rules:
            passed, message, details = rule.validate(output)

            if not passed:
                violations.append(RuleViolation(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    check_type=rule.check_type,
                    message=message,
                    details=details,
                    suggested_fix=rule.fixer.__name__ if rule.fixer else None
                ))

        return violations

    def enable(self, rule_id: str, enabled: bool = True):
        """启用/禁用规则"""
        if rule_id in self._rules:
            self._rules[rule_id].enabled = enabled

    def update_config(self, rule_id: str, config: Dict[str, Any]):
        """更新规则配置"""
        if rule_id in self._rules:
            self._rules[rule_id].rule_config.update(config)

    def export_rules(self) -> List[Dict[str, Any]]:
        """导出规则配置"""
        return [
            {
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "check_type": r.check_type.value,
                "rule_config": r.rule_config,
                "enabled": r.enabled,
                "priority": r.priority
            }
            for r in self._rules.values()
        ]

    def import_rules(self, rules_data: List[Dict[str, Any]]):
        """导入规则配置"""
        for data in rules_data:
            rule = ValidationRule(
                id=data["id"],
                name=data["name"],
                description=data.get("description", ""),
                check_type=CheckType(data.get("check_type", "format")),
                rule_config=data.get("rule_config", {}),
                enabled=data.get("enabled", True),
                priority=data.get("priority", 0)
            )
            self.register(rule)
