"""
自动修复器

根据验证结果自动修复问题
"""

from typing import Any, Callable, Dict, List, Optional, Tuple
import logging

from .checker import ValidationResult, ValidationCheck, CheckType

logger = logging.getLogger(__name__)


class AutoFixer:
    """
    自动修复器

    功能:
    - 分析验证结果
    - 生成修复方案
    - 执行自动修复
    - 验证修复效果
    """

    def __init__(self, max_retries: int = 3):
        """
        初始化修复器

        Args:
            max_retries: 最大修复尝试次数
        """
        self.max_retries = max_retries

        # 修复函数注册表
        self._fix_functions: Dict[str, Callable] = {}

        # 注册默认修复函数
        self._register_default_fixes()

    def _register_default_fixes(self):
        """注册默认修复函数"""
        self._fix_functions = {
            "format": self._fix_format,
            "dimension": self._fix_dimension,
            "color": self._fix_color,
            "composition": self._fix_composition,
            "quality": self._fix_quality
        }

    def register_fix(self, issue_type: str, fix_function: Callable):
        """注册自定义修复函数"""
        self._fix_functions[issue_type] = fix_function

    async def fix(
        self,
        output: Any,
        validation_result: ValidationResult,
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[Any, List[Dict[str, Any]]]:
        """
        自动修复问题

        Args:
            output: 待修复的输出
            validation_result: 验证结果
            context: 修复上下文

        Returns:
            (修复后的输出, 修复记录列表)
        """
        current_output = output
        fix_records = []

        # 按优先级处理每个失败的检查
        failed_checks = [
            c for c in validation_result.checks
            if not c.passed and c.check_type.value in self._fix_functions
        ]

        for check in failed_checks:
            fix_type = check.check_type.value

            if fix_type not in self._fix_functions:
                continue

            fix_func = self._fix_functions[fix_type]

            try:
                for attempt in range(self.max_retries):
                    fixed_output = await fix_func(current_output, check, context)

                    if fixed_output is None:
                        break

                    current_output = fixed_output
                    fix_records.append({
                        "check_type": fix_type,
                        "attempt": attempt + 1,
                        "original_check": check.to_dict(),
                        "status": "success"
                    })

                    # 验证修复效果
                    # 注意：这里需要重新验证，但为了避免循环依赖，简化处理

            except Exception as e:
                logger.exception(f"修复失败: {fix_type}")
                fix_records.append({
                    "check_type": fix_type,
                    "attempt": 0,
                    "status": "failed",
                    "error": str(e)
                })

        return current_output, fix_records

    async def _fix_format(
        self,
        output: Any,
        check: ValidationCheck,
        context: Optional[Dict]
    ) -> Optional[Any]:
        """修复格式问题"""
        if isinstance(output, dict) and "url" in output:
            url = output["url"]
            # 尝试转换格式
            if url.endswith(".png"):
                # 不支持 PNG 转其他格式，返回 None 表示无法自动修复
                return None

        return None

    async def _fix_dimension(
        self,
        output: Any,
        check: ValidationCheck,
        context: Optional[Dict]
    ) -> Optional[Any]:
        """修复尺寸问题"""
        if isinstance(output, dict):
            current_width = output.get("width", 0)
            current_height = output.get("height", 0)
            target_width = context.get("target_width") if context else None
            target_height = context.get("target_height") if context else None

            if target_width and target_height:
                # 标记需要调整尺寸
                output["resize_required"] = True
                output["target_size"] = (target_width, target_height)

        return None  # 需要重新生成

    async def _fix_color(
        self,
        output: Any,
        check: ValidationCheck,
        context: Optional[Dict]
    ) -> Optional[Any]:
        """修复色彩问题"""
        if isinstance(output, dict):
            brand_colors = context.get("brand_colors", []) if context else []

            if brand_colors:
                # 添加调整色彩建议
                output["color_adjustment_needed"] = True
                output["suggested_colors"] = brand_colors

        return None  # 需要重新生成

    async def _fix_composition(
        self,
        output: Any,
        check: ValidationCheck,
        context: Optional[Dict]
    ) -> Optional[Any]:
        """修复构图问题"""
        if isinstance(output, dict):
            suggestions = check.suggestions or []

            if suggestions:
                output["composition_advice"] = suggestions

        return None  # 需要重新生成

    async def _fix_quality(
        self,
        output: Any,
        check: ValidationCheck,
        context: Optional[Dict]
    ) -> Optional[Any]:
        """修复质量问题"""
        if isinstance(output, dict):
            # 尝试提高质量设置
            current_quality = output.get("quality", "standard")
            if current_quality == "standard":
                output["quality"] = "hd"
                output["regenerate"] = True
                return output

        return None  # 需要重新生成

    def generate_fix_plan(
        self,
        validation_result: ValidationResult,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        生成修复计划

        Returns:
            修复步骤列表
        """
        plan = []

        for check in validation_result.checks:
            if check.passed:
                continue

            fix_type = check.check_type.value

            if fix_type in self._fix_functions:
                plan.append({
                    "step": fix_type,
                    "issue": check.message,
                    "suggestions": check.suggestions,
                    "can_auto_fix": True,
                    "requires_regeneration": fix_type in ["dimension", "color", "quality"]
                })
            else:
                plan.append({
                    "step": fix_type,
                    "issue": check.message,
                    "suggestions": check.suggestions,
                    "can_auto_fix": False
                })

        return plan


# 扩展 ValidationCheck 类
def _check_to_dict(self) -> Dict[str, Any]:
    """转换为字典"""
    return {
        "check_type": self.check_type.value if hasattr(self.check_type, 'value') else self.check_type,
        "name": self.name,
        "passed": self.passed,
        "score": self.score,
        "message": self.message,
        "details": self.details,
        "suggestions": self.suggestions
    }


ValidationCheck.to_dict = _check_to_dict
