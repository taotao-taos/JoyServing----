---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 30450220532b431a7f27fd0f444b6d7bade5bcc37fe3defce57a5576679a44d2a7a9a308022100a208e75914538462d699915eebf4d2b960d0697d37a683f0fbbcd31c92a2bd3c
    ReservedCode2: 3046022100d4d6846bd47c2313464cd7cd04d620d615f6071cb749cc353fc24caf4b99fdb902210083941f67c679e789a24db99201e34b4bc352d7547cee3de7bd476ff5d342f31f
---

# Creagic AI 策略工程框架

## 概述

Creagic AI 策略工程框架是 **大模型与业务API之间的智能编排层**，旨在为AI设计助手提供完整的Agent Harness能力。

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户交互层                                 │
│                    (前端 / API / SDK)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Creagic AI 策略引擎                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  上下文记忆  │  │  工具调用   │  │  任务规划   │              │
│  │   Manager   │  │   System   │  │  Planner   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   质量验证   │  │  多Agent   │  │   会话持久   │              │
│  │  Checker   │  │  协作系统   │  │    化       │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        LLM 层                                    │
│              (OpenAI / Anthropic / Google / 本地)               │
└─────────────────────────────────────────────────────────────────┘
```

## 核心能力

### 1. 上下文记忆管理 (Context Memory)

```python
from creagic import MemoryManager, MemoryType

memory_manager = MemoryManager(max_entries=1000)

# 存储记忆
memory = memory_manager.store(
    content="用户偏好简约、科技感的设计风格",
    memory_type=MemoryType.SEMANTIC,
    session_id="session_001",
    importance=0.8
)

# 检索相关记忆
related = memory_manager.recall(
    query="设计风格",
    session_id="session_001",
    top_k=5
)

# 构建对话上下文
context = memory_manager.build_context(
    session_id="session_001",
    query="设计海报"
)
```

**特点:**
- 多层次记忆 (语义/情景/程序/工作)
- 向量相似度检索
- 自动过期清理
- 智能上下文构建

### 2. 工具调用系统 (Tool Calling)

```python
from creagic import ToolRegistry, ToolExecutor
from creagic.tools.schemas import ToolDefinition, ParameterSchema, ParameterType, ParameterRequired

# 创建工具定义
tool_def = ToolDefinition(
    name="generate_poster",
    description="根据提示词生成海报图片",
    parameters=[
        ParameterSchema(
            name="prompt",
            type=ParameterType.STRING,
            description="海报描述",
            required=ParameterRequired.REQUIRED
        ),
        ParameterSchema(
            name="style",
            type=ParameterType.STRING,
            description="艺术风格",
            required=ParameterRequired.OPTIONAL,
            default="modern"
        )
    ]
)

# 注册工具
registry = ToolRegistry()
registry.register(tool_def, implementation=generate_poster_func)

# 执行工具
executor = ToolExecutor(registry)
result = await executor.execute("generate_poster", {"prompt": "科技海报"})
```

**特点:**
- 参数自动验证
- 超时控制
- 自动重试
- 审批流程集成
- 批量执行

### 3. 任务规划与分解 (Task Planning)

```python
from creagic import TaskPlanner, TaskDecomposer

# 初始化规划器
planner = TaskPlanner(llm_provider=llm_provider)

# 创建执行计划
plan = planner.create_plan(
    task="设计一个科技公司年度盛典海报",
    context={"theme": "科技", "event": "年度盛典"}
)

# 自动分解复杂任务
decomposer = TaskDecomposer(max_depth=3)
task_tree = decomposer.decompose(
    task="设计一套品牌视觉系统",
    depth=0
)

# 获取执行顺序
batches = decomposer.get_execution_order(task_tree)
```

**特点:**
- LLM 智能规划
- 启发式分解
- 依赖管理
- 并行执行优化
- 执行顺序优化

### 4. 输出验证与质量检查 (Validation)

```python
from creagic import QualityChecker
from creagic.validation import CheckType

checker = QualityChecker(min_score=70.0)

# 设置品牌规范
checker.set_brand_guidelines({
    "colors": ["#0066CC", "#00AAFF"],
    "styles": ["科技感", "简约"],
    "fonts": ["思源黑体"]
})

# 执行验证
result = await checker.check(
    output=design_output,
    check_types=[CheckType.COLOR, CheckType.BRAND, CheckType.COMPOSITION]
)

print(f"综合得分: {result.score}")
print(f"是否通过: {result.passed}")
```

**检查维度:**
- 格式检查
- 尺寸检查
- 色彩检查
- 品牌合规
- 一致性检查
- 构图检查
- 整体质量

### 5. 多 Agent 协作 (Multi-Agent)

```python
from creagic.multi_agent import AgentTeam, AgentFactory, CollaborationMode

# 创建团队
team = AgentTeam(name="设计团队", collaboration_mode=CollaborationMode.HIERARCHICAL)

# 添加 Agent
team.add_agent(AgentFactory.create_coordinator())
team.add_agent(AgentFactory.create_design_agent())
team.add_agent(AgentFactory.create_validator())

# 分发任务
results = await team.dispatch_task(
    "设计一个产品发布会海报",
    context={"event": "产品发布", "date": "2024-01-15"}
)
```

**协作模式:**
- 层级协作 (Hierarchical)
- 点对点协作 (Peer-to-Peer)
- 轮询协作 (Round Robin)
- 中心化协作 (Centralized)

### 6. 会话持久化 (Session Persistence)

```python
from creagic import SessionStore, BackupManager, SnapshotManager

# 会话存储
session_store = SessionStore(storage_type="file")
session = session_store.create("user_001", "user_id")
session.add_message("user", "帮我设计logo")
session.add_message("assistant", "好的，请问您有什么具体需求？")

# 快照
snapshot_manager = SnapshotManager()
snapshot = snapshot_manager.create(
    name="设计任务_v1",
    data={"session": session.to_dict()}
)

# 自动备份
backup_manager = BackupManager(backup_interval=3600)
backup_manager.start_auto_backup()
```

## 快速开始

### 安装

```bash
pip install creagic-engine
```

### 基础使用

```python
import asyncio
from creagic import CreagicEngine, EngineConfig

async def main():
    # 配置
    config = EngineConfig(
        llm_provider="openai",
        llm_model="gpt-4o",
        api_key="your-api-key"
    )

    # 初始化引擎
    engine = CreagicEngine(config)

    # 处理任务
    result = await engine.process(
        task="帮我设计一个科技主题的社交媒体封面",
        user_id="user_001",
        context={"theme": "科技", "platform": "微信"}
    )

    print(f"质量评分: {result['validation']['score']}")
    print(f"响应: {result['response']['content']}")

    engine.shutdown()

asyncio.run(main())
```

## 项目结构

```
creagic-engine/
├── src/creagic/
│   ├── __init__.py           # 主入口
│   ├── config/               # 配置模块
│   │   ├── __init__.py
│   │   ├── models.py         # 数据模型
│   │   ├── manager.py        # 配置管理器
│   │   └── registry.py       # LLM 提供者注册表
│   ├── core/                 # 核心引擎
│   │   ├── __init__.py
│   │   └── engine.py         # 主引擎
│   ├── memory/               # 记忆管理
│   │   ├── __init__.py
│   │   ├── manager.py        # 记忆管理器
│   │   ├── types.py          # 记忆类型定义
│   │   ├── vector_store.py   # 向量存储
│   │   └── context_window.py # 上下文窗口
│   ├── tools/                # 工具系统
│   │   ├── __init__.py
│   │   ├── registry.py       # 工具注册表
│   │   ├── executor.py       # 工具执行器
│   │   └── schemas.py        # 工具定义模式
│   ├── planning/             # 任务规划
│   │   ├── __init__.py
│   │   ├── planner.py       # 任务规划器
│   │   ├── decomposer.py    # 任务分解器
│   │   └── scheduler.py     # 任务调度器
│   ├── validation/           # 质量验证
│   │   ├── __init__.py
│   │   ├── checker.py        # 质量检查器
│   │   ├── rules.py         # 验证规则
│   │   └── fixer.py         # 自动修复
│   ├── multi_agent/          # 多Agent系统
│   │   ├── __init__.py
│   │   ├── agent.py         # Agent 定义
│   │   ├── team.py          # Agent 团队
│   │   └── coordinator.py   # 协调器
│   └── persistence/          # 持久化
│       ├── __init__.py
│       ├── session.py       # 会话存储
│       ├── backup.py        # 备份管理
│       └── snapshot.py      # 快照管理
├── examples/
│   └── basic_usage.py       # 使用示例
├── README.md
└── setup.py
```

## API 文档

### CreagicEngine

核心引擎类，整合所有模块。

**方法:**

- `process(task, user_id, session_id, context)` - 处理任务
- `create_session(user_id)` - 创建会话
- `get_session(session_id)` - 获取会话
- `add_memory(content, memory_type, session_id)` - 添加记忆
- `recall_memories(query, session_id)` - 检索记忆
- `register_tool(name, func, description)` - 注册工具
- `execute_tool(tool_name, arguments)` - 执行工具
- `validate_output(output, context)` - 验证输出
- `create_snapshot(name, description, tags)` - 创建快照
- `get_stats()` - 获取统计信息

### 配置参数

```python
EngineConfig(
    # LLM 配置
    llm_provider="openai",           # 提供者: openai, anthropic, google, local
    llm_model="gpt-4o",             # 模型
    api_key="",                      # API Key

    # 存储配置
    storage_path="./data",           # 存储路径
    session_storage_type="file",      # 会话存储类型: memory, sqlite, file

    # 记忆配置
    max_memory_entries=1000,         # 最大记忆条目
    memory_retention_days=30,         # 记忆保留天数

    # 工具配置
    tool_timeout=30,                  # 工具超时(秒)
    tool_parallel_limit=5,            # 工具并行限制

    # 验证配置
    validation_level="normal",        # 验证级别: strict, normal, relaxed
    min_quality_score=70.0,          # 最低质量分数

    # 多Agent配置
    enable_multi_agent=True,         # 启用多Agent
    max_agents=5,                    # 最大Agent数

    # 备份配置
    enable_auto_backup=True,         # 启用自动备份
    backup_interval=3600,            # 备份间隔(秒)
    max_backups=10                   # 最大备份数
)
```

## 许可

MIT License
