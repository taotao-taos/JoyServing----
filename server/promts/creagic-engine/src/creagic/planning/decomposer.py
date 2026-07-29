"""
任务分解器

将复杂任务递归分解为可执行的子任务
"""

from typing import Any, Callable, Dict, List, Optional, Set
import uuid


class TaskDecomposer:
    """
    任务分解器

    功能:
    - 递归分解复杂任务
    - 识别任务依赖关系
    - 估算任务复杂度
    - 生成执行顺序
    """

    def __init__(
        self,
        max_depth: int = 3,
        max_subtasks: int = 10,
        decomposer_prompt: Optional[str] = None
    ):
        """
        初始化任务分解器

        Args:
            max_depth: 最大分解深度
            max_subtasks: 每个任务最大子任务数
            decomposer_prompt: 自定义分解提示
        """
        self.max_depth = max_depth
        self.max_subtasks = max_subtasks
        self.decomposer_prompt = decomposer_prompt

        # 分解规则
        self._decomposition_rules: Dict[str, Callable] = {}

    def decompose(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        depth: int = 0
    ) -> "TaskNode":
        """
        分解任务

        Args:
            task: 任务描述
            context: 任务上下文
            depth: 当前深度

        Returns:
            任务树根节点
        """
        root = TaskNode(
            id=str(uuid.uuid4()),
            task=task,
            context=context or {},
            depth=depth
        )

        # 检查是否达到最大深度
        if depth >= self.max_depth:
            root.is_leaf = True
            return root

        # 尝试使用自定义规则分解
        for pattern, rule in self._decomposition_rules.items():
            if pattern in task:
                subtasks = rule(task, context)
                if subtasks:
                    root.add_children(subtasks)
                    return root

        # 使用默认分解逻辑
        subtasks = self._default_decompose(task, context)

        if subtasks:
            for subtask in subtasks[:self.max_subtasks]:
                child = self.decompose(
                    subtask["task"],
                    subtask.get("context"),
                    depth + 1
                )
                root.add_child(child)

        # 如果没有子任务，标记为叶子节点
        if not root.children:
            root.is_leaf = True

        return root

    def _default_decompose(
        self,
        task: str,
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        默认分解逻辑

        根据任务关键词进行分解
        """
        task_lower = task.lower()
        subtasks = []

        # 设计任务分解
        if any(kw in task_lower for kw in ["海报", "banner", "封面", "设计"]):
            subtasks = [
                {"task": "分析设计需求", "context": {"aspect": "requirements"}},
                {"task": "收集设计参考", "context": {"aspect": "references"}},
                {"task": "确定设计风格", "context": {"aspect": "style"}},
                {"task": "生成设计初稿", "context": {"aspect": "draft"}},
                {"task": "优化调整细节", "context": {"aspect": "refinement"}},
                {"task": "最终质量检查", "context": {"aspect": "quality"}}
            ]

        # 编辑任务分解
        elif any(kw in task_lower for kw in ["编辑", "修改", "调整"]):
            subtasks = [
                {"task": "理解编辑需求", "context": {"aspect": "requirements"}},
                {"task": "定位修改区域", "context": {"aspect": "location"}},
                {"task": "执行编辑操作", "context": {"aspect": "editing"}},
                {"task": "验证编辑效果", "context": {"aspect": "verification"}}
            ]

        # 多图任务分解
        elif any(kw in task_lower for kw in ["批量", "多个", "系列", "一组"]):
            subtasks = [
                {"task": "规划系列主题", "context": {"aspect": "theme"}},
                {"task": "设计统一风格", "context": {"aspect": "unified_style"}},
                {"task": "批量生成内容", "context": {"aspect": "batch_generation"}},
                {"task": "统一质量审核", "context": {"aspect": "quality_review"}}
            ]

        # 品牌设计任务分解
        elif any(kw in task_lower for kw in ["品牌", "logo", "vi", "视觉"]):
            subtasks = [
                {"task": "品牌调研分析", "context": {"aspect": "research"}},
                {"task": "品牌定位", "context": {"aspect": "positioning"}},
                {"task": "核心视觉设计", "context": {"aspect": "core_design"}},
                {"task": "延展物料设计", "context": {"aspect": "extension"}},
                {"task": "品牌规范文档", "context": {"aspect": "guidelines"}}
            ]

        # 社交媒体内容分解
        elif any(kw in task_lower for kw in ["社交", "小红书", "微博", "instagram"]):
            subtasks = [
                {"task": "分析平台特点", "context": {"aspect": "platform"}},
                {"task": "策划内容方向", "context": {"aspect": "content"}},
                {"task": "设计视觉呈现", "context": {"aspect": "visual"}},
                {"task": "添加文案排版", "context": {"aspect": "copy"}},
                {"task": "优化分享效果", "context": {"aspect": "optimization"}}
            ]

        return subtasks

    def register_rule(self, pattern: str, decomposer: Callable):
        """
        注册自定义分解规则

        Args:
            pattern: 匹配模式
            decomposer: 分解函数 (task, context) -> List[Dict]
        """
        self._decomposition_rules[pattern] = decomposer

    def flatten(self, root: "TaskNode") -> List[Dict[str, Any]]:
        """
        将任务树展平为列表

        返回:
            按执行顺序排列的任务列表
        """
        result = []
        self._flatten_recursive(root, result)
        return result

    def _flatten_recursive(self, node: "TaskNode", result: List):
        """递归展平"""
        result.append({
            "id": node.id,
            "task": node.task,
            "context": node.context,
            "depth": node.depth,
            "is_leaf": node.is_leaf
        })

        for child in node.children:
            self._flatten_recursive(child, result)

    def get_execution_order(self, root: "TaskNode") -> List[List[str]]:
        """
        获取可并行执行的批次

        返回:
            批次列表，每个批次内的任务可以并行执行
        """
        batches = []
        remaining = {node.id for node in self._traverse(root)}
        completed = set()

        while remaining:
            batch = []

            for node in self._traverse(root):
                if node.id in remaining:
                    # 检查依赖是否都已完成
                    deps = node.dependencies
                    if all(dep in completed for dep in deps):
                        batch.append(node.id)

            if not batch:
                # 如果没有可执行的，可能存在循环依赖
                break

            batches.append(batch)
            completed.update(batch)
            remaining -= set(batch)

        return batches

    def _traverse(self, node: "TaskNode") -> List["TaskNode"]:
        """遍历所有节点"""
        nodes = [node]
        for child in node.children:
            nodes.extend(self._traverse(child))
        return nodes


class TaskNode:
    """
    任务节点

    表示任务树中的一个节点
    """

    def __init__(
        self,
        id: str,
        task: str,
        context: Optional[Dict[str, Any]] = None,
        depth: int = 0
    ):
        self.id = id
        self.task = task
        self.context = context or {}
        self.depth = depth
        self.children: List[TaskNode] = []
        self.dependencies: Set[str] = set()
        self.is_leaf = False
        self.result: Any = None
        self.status = "pending"  # pending, running, completed, failed

    def add_child(self, node: "TaskNode"):
        """添加子节点"""
        node.depth = self.depth + 1
        self.children.append(node)

        # 设置依赖：子任务依赖父任务
        node.dependencies.add(self.id)

    def add_children(self, tasks: List[Dict[str, Any]]):
        """批量添加子节点"""
        for task_data in tasks:
            child = TaskNode(
                id=str(uuid.uuid4()),
                task=task_data["task"],
                context=task_data.get("context"),
                depth=self.depth + 1
            )
            child.dependencies.add(self.id)
            self.children.append(child)

    def get_all_descendants(self) -> List["TaskNode"]:
        """获取所有后代节点"""
        descendants = []
        for child in self.children:
            descendants.append(child)
            descendants.extend(child.get_all_descendants())
        return descendants

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "task": self.task,
            "context": self.context,
            "depth": self.depth,
            "is_leaf": self.is_leaf,
            "status": self.status,
            "result": self.result,
            "children": [c.to_dict() for c in self.children]
        }

    def __repr__(self) -> str:
        return f"TaskNode(id={self.id[:8]}, task={self.task[:30]}...)"
