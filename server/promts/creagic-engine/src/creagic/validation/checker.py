"""
质量检查器

对设计输出进行全面质量验证
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional
import asyncio
import uuid

from ..config.models import ValidationLevel


class CheckType(str, Enum):
    """检查类型"""
    FORMAT = "format"           # 格式检查
    DIMENSION = "dimension"     # 尺寸检查
    COLOR = "color"             # 色彩检查
    BRAND = "brand"             # 品牌合规
    CONSISTENCY = "consistency" # 一致性检查
    ACCESSIBILITY = "accessibility"  # 可访问性
    COMPOSITION = "composition" # 构图检查
    QUALITY = "quality"          # 整体质量


@dataclass
class ValidationCheck:
    """
    单个验证检查

    Attributes:
        check_type: 检查类型
        name: 检查名称
        passed: 是否通过
        score: 得分 (0-100)
        message: 检查消息
        details: 详细结果
        suggestions: 改进建议
    """
    check_type: CheckType
    name: str
    passed: bool
    score: float
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    """
    验证结果

    Attributes:
        passed: 是否全部通过
        score: 综合得分
        checks: 各维度检查结果
        issues: 发现的问题列表
        suggestions: 改进建议
        metadata: 附加信息
        validated_at: 验证时间
    """
    passed: bool
    score: float
    checks: List[ValidationCheck]
    issues: List[Dict[str, Any]] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    validated_at: datetime = field(default_factory=datetime.now)

    def add_issue(self, severity: str, check_type: str, message: str, details: Optional[Dict] = None):
        """添加问题"""
        self.issues.append({
            "id": str(uuid.uuid4()),
            "severity": severity,  # critical, warning, info
            "check_type": check_type,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        })

    def add_suggestion(self, suggestion: str):
        """添加建议"""
        if suggestion not in self.suggestions:
            self.suggestions.append(suggestion)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "passed": self.passed,
            "score": self.score,
            "checks": [
                {
                    "type": c.check_type.value,
                    "name": c.name,
                    "passed": c.passed,
                    "score": c.score,
                    "message": c.message
                }
                for c in self.checks
            ],
            "issues": self.issues,
            "suggestions": self.suggestions,
            "metadata": self.metadata,
            "validated_at": self.validated_at.isoformat()
        }


class QualityChecker:
    """
    质量检查器

    功能:
    - 多维度质量检查
    - 品牌合规验证
    - 自动修复建议
    - 批量检查支持
    """

    def __init__(
        self,
        default_level: ValidationLevel = ValidationLevel.NORMAL,
        min_score: float = 70.0
    ):
        """
        初始化检查器

        Args:
            default_level: 默认验证级别
            min_score: 最低合格分数
        """
        self.default_level = default_level
        self.min_score = min_score

        # 检查函数注册表
        self._check_functions: Dict[CheckType, Callable] = {}

        # 注册默认检查函数
        self._register_default_checks()

        # 品牌规范
        self._brand_guidelines: Dict[str, Any] = {}

    def _register_default_checks(self):
        """注册默认检查函数"""
        self._check_functions = {
            CheckType.FORMAT: self._check_format,
            CheckType.DIMENSION: self._check_dimension,
            CheckType.COLOR: self._check_color,
            CheckType.BRAND: self._check_brand,
            CheckType.CONSISTENCY: self._check_consistency,
            CheckType.COMPOSITION: self._check_composition,
            CheckType.QUALITY: self._check_quality
        }

    def set_brand_guidelines(self, guidelines: Dict[str, Any]):
        """设置品牌规范"""
        self._brand_guidelines = guidelines

    def register_check(self, check_type: CheckType, function: Callable):
        """注册自定义检查函数"""
        self._check_functions[check_type] = function

    async def check(
        self,
        output: Any,
        check_types: Optional[List[CheckType]] = None,
        level: Optional[ValidationLevel] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """
        执行质量检查

        Args:
            output: 待检查的输出
            check_types: 要执行的检查类型列表
            level: 验证级别
            context: 检查上下文

        Returns:
            验证结果
        """
        level = level or self.default_level
        context = context or {}
        checks = []

        # 如果没有指定检查类型，执行所有已注册的检查
        if not check_types:
            check_types = list(self._check_functions.keys())

        total_score = 0.0
        weights = {
            CheckType.FORMAT: 0.10,
            CheckType.DIMENSION: 0.10,
            CheckType.COLOR: 0.15,
            CheckType.BRAND: 0.20,
            CheckType.CONSISTENCY: 0.15,
            CheckType.COMPOSITION: 0.15,
            CheckType.QUALITY: 0.15
        }

        for check_type in check_types:
            if check_type not in self._check_functions:
                continue

            check_func = self._check_functions[check_type]

            try:
                if asyncio.iscoroutinefunction(check_func):
                    result = await check_func(output, context)
                else:
                    result = check_func(output, context)
                if isinstance(result, ValidationCheck):
                    checks.append(result)
                    total_score += result.score * weights.get(check_type, 0.1)
            except Exception as e:
                checks.append(ValidationCheck(
                    check_type=check_type,
                    name=check_type.value,
                    passed=False,
                    score=0,
                    message=f"检查执行失败: {str(e)}"
                ))

        # 计算综合得分
        score = total_score / sum(weights.get(c, 0.1) for c in check_types) if check_types else 0

        # 判断是否通过
        passed = score >= self.min_score

        # 构建结果
        result = ValidationResult(
            passed=passed,
            score=score,
            checks=checks
        )

        # 根据验证级别处理问题
        if not passed and level == ValidationLevel.STRICT:
            result.add_issue(
                severity="critical",
                check_type="overall",
                message=f"质量检查未通过 (得分: {score:.1f}, 最低要求: {self.min_score})"
            )

        return result

    def _check_format(self, output: Any, context: Dict) -> ValidationCheck:
        """检查格式"""
        # 检查是否为支持的图片格式
        supported_formats = ["png", "jpg", "jpeg", "webp", "svg"]
        score = 100.0
        issues = []

        if isinstance(output, dict) and "format" in output:
            fmt = output.get("format", "").lower()
            if fmt not in supported_formats:
                score = 0
                issues.append(f"不支持的图片格式: {fmt}")

        elif isinstance(output, str):
            if "." in output:
                fmt = output.split(".")[-1].lower()
                if fmt not in supported_formats:
                    score = 50
                    issues.append(f"文件格式可能不兼容: {fmt}")

        return ValidationCheck(
            check_type=CheckType.FORMAT,
            name="格式检查",
            passed=score >= 70,
            score=score,
            message="格式正确" if score >= 70 else "; ".join(issues),
            suggestions=["建议使用 PNG 或 WebP 格式以获得最佳质量"] if score < 100 else []
        )

    def _check_dimension(self, output: Any, context: Dict) -> ValidationCheck:
        """检查尺寸"""
        score = 100.0
        issues = []
        suggestions = []

        target_width = context.get("target_width")
        target_height = context.get("target_height")

        if isinstance(output, dict):
            width = output.get("width")
            height = output.get("height")

            if width and height:
                # 检查是否为目标尺寸
                if target_width and target_height:
                    if width != target_width or height != target_height:
                        score = 70
                        issues.append(f"尺寸不匹配: 实际 {width}x{height}, 目标 {target_width}x{target_height}")
                        suggestions.append(f"建议调整到 {target_width}x{target_height}")

                # 检查最小尺寸
                if width < 512 or height < 512:
                    score = min(score, 60)
                    issues.append(f"尺寸过小: {width}x{height}")

                # 检查宽高比
                ratio = width / height if height > 0 else 0
                if ratio > 10 or ratio < 0.1:
                    score = min(score, 50)
                    issues.append(f"宽高比异常: {ratio:.2f}")

        return ValidationCheck(
            check_type=CheckType.DIMENSION,
            name="尺寸检查",
            passed=score >= 70,
            score=score,
            message="尺寸合格" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _check_color(self, output: Any, context: Dict) -> ValidationCheck:
        """检查色彩"""
        score = 100.0
        issues = []
        suggestions = []

        # 检查颜色数量
        if isinstance(output, dict) and "color_count" in output:
            color_count = output["color_count"]
            if color_count > 20:
                score = 70
                issues.append(f"颜色数量过多: {color_count} 种")
                suggestions.append("建议控制在 10 种颜色以内以保持视觉简洁")

        # 检查品牌色彩
        brand_colors = self._brand_guidelines.get("colors", [])
        if brand_colors and isinstance(output, dict):
            dominant_colors = output.get("dominant_colors", [])
            if dominant_colors:
                # 简化检查：只检查是否包含品牌色
                has_brand_color = any(
                    self._color_similarity(dc, bc) > 0.8
                    for dc in dominant_colors
                    for bc in brand_colors
                )
                if not has_brand_color:
                    score = min(score, 75)
                    issues.append("未检测到品牌主色调")
                    suggestions.append(f"建议添加品牌色: {brand_colors[0]}")

        return ValidationCheck(
            check_type=CheckType.COLOR,
            name="色彩检查",
            passed=score >= 70,
            score=score,
            message="色彩搭配合理" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _check_brand(self, output: Any, context: Dict) -> ValidationCheck:
        """检查品牌合规"""
        score = 100.0
        issues = []
        suggestions = []

        if not self._brand_guidelines:
            return ValidationCheck(
                check_type=CheckType.BRAND,
                name="品牌合规",
                passed=True,
                score=100,
                message="未设置品牌规范，跳过检查"
            )

        # 检查品牌风格关键词
        brand_styles = self._brand_guidelines.get("styles", [])
        if brand_styles and isinstance(output, dict):
            output_style = output.get("style", "")
            if output_style and output_style not in brand_styles:
                score = 60
                issues.append(f"风格偏离品牌规范: {output_style}")
                suggestions.append(f"建议使用品牌风格: {', '.join(brand_styles)}")

        # 检查品牌字体
        brand_fonts = self._brand_guidelines.get("fonts", [])
        if brand_fonts and isinstance(output, dict):
            output_fonts = output.get("fonts", [])
            if output_fonts:
                non_brand_fonts = [f for f in output_fonts if f not in brand_fonts]
                if non_brand_fonts:
                    score = min(score, 70)
                    issues.append(f"使用了非品牌字体: {', '.join(non_brand_fonts)}")

        return ValidationCheck(
            check_type=CheckType.BRAND,
            name="品牌合规",
            passed=score >= 70,
            score=score,
            message="符合品牌规范" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _check_consistency(self, output: Any, context: Dict) -> ValidationCheck:
        """检查一致性"""
        score = 100.0
        issues = []
        suggestions = []

        # 系列作品一致性检查
        series_context = context.get("series_context")
        if series_context and isinstance(output, dict):
            series_outputs = series_context.get("outputs", [])

            # 检查风格一致性
            if series_outputs:
                main_style = series_outputs[0].get("style", "")
                if output.get("style", "") != main_style:
                    score = 60
                    issues.append("与系列作品风格不一致")

            # 检查尺寸一致性
            main_size = series_outputs[0].get("size", "") if series_outputs else ""
            if main_size and output.get("size", "") != main_size:
                score = 70
                issues.append("与系列作品尺寸不一致")

        return ValidationCheck(
            check_type=CheckType.CONSISTENCY,
            name="一致性检查",
            passed=score >= 70,
            score=score,
            message="一致性良好" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _check_composition(self, output: Any, context: Dict) -> ValidationCheck:
        """检查构图"""
        score = 100.0
        issues = []
        suggestions = []

        if isinstance(output, dict):
            composition = output.get("composition", {})

            # 检查主题位置
            subject_position = composition.get("subject_position", "center")
            if subject_position not in ["center", "left_third", "right_third", "upper", "lower"]:
                score = 70
                suggestions.append("建议使用三分法或中心构图")

            # 检查留白
            whitespace_ratio = composition.get("whitespace_ratio", 0)
            if whitespace_ratio < 0.1:
                score = min(score, 80)
                issues.append("画面过于拥挤，建议增加留白")

            # 检查文字区域
            text_area = composition.get("has_text_area", False)
            if text_area:
                text_position = composition.get("text_position", "center")
                if text_position == "center":
                    suggestions.append("文字居中可能影响视觉层次，建议使用其他位置")

        return ValidationCheck(
            check_type=CheckType.COMPOSITION,
            name="构图检查",
            passed=score >= 70,
            score=score,
            message="构图合理" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _check_quality(self, output: Any, context: Dict) -> ValidationCheck:
        """整体质量检查"""
        score = 100.0
        issues = []
        suggestions = []

        if isinstance(output, dict):
            # 检查清晰度
            if "clarity" in output:
                clarity = output["clarity"]
                if clarity < 0.7:
                    score = min(score, 60)
                    issues.append(f"清晰度不足: {clarity}")

            # 检查完整性
            completeness = output.get("completeness", 1.0)
            if completeness < 0.8:
                score = min(score, 70)
                issues.append(f"内容完整度不足: {completeness * 100:.0f}%")
                suggestions.append("请确保画面元素完整，没有被截断")

        return ValidationCheck(
            check_type=CheckType.QUALITY,
            name="整体质量",
            passed=score >= 70,
            score=score,
            message="质量合格" if score >= 70 else "; ".join(issues),
            suggestions=suggestions
        )

    def _color_similarity(self, color1: str, color2: str) -> float:
        """计算颜色相似度"""
        # 简化实现：只检查是否完全相同
        return 1.0 if color1.lower() == color2.lower() else 0.0

    async def batch_check(
        self,
        outputs: List[Any],
        **kwargs
    ) -> List[ValidationResult]:
        """批量检查"""
        results = []
        for output in outputs:
            result = await self.check(output, **kwargs)
            results.append(result)
        return results
