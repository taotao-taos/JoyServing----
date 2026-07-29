"""
Creagic AI 策略工程框架使用示例

展示框架的核心功能和使用方法
"""

import asyncio
import os

# 设置 API Key (建议使用环境变量)
os.environ.setdefault("OPENAI_API_KEY", "your-api-key-here")

from creagic import (
    CreagicEngine,
    EngineConfig,
    MemoryType,
    ToolRegistry,
    ToolExecutor,
    QualityChecker
)
from creagic.tools import ToolDefinition


async def basic_example():
    """基础使用示例"""
    print("=" * 60)
    print("Creagic AI 策略工程框架 - 基础示例")
    print("=" * 60)

    # 创建引擎配置
    config = EngineConfig(
        llm_provider="openai",
        llm_model="gpt-4o",
        api_key=os.environ.get("OPENAI_API_KEY", ""),
        storage_path="./data",
        enable_multi_agent=False
    )

    # 初始化引擎
    engine = CreagicEngine(config)

    # 处理设计任务
    print("\n[1] 处理设计任务...")

    result = await engine.process(
        task="帮我设计一个科技公司年度盛典的海报",
        user_id="user_001",
        context={
            "type": "海报",
            "theme": "科技",
            "event": "年度盛典",
            "target_audience": "科技从业者",
            "color_scheme": ["蓝色", "紫色"]
        }
    )

    print(f"   任务: {result['task']}")
    print(f"   会话ID: {result['session_id']}")
    print(f"   质量评分: {result['validation']['score']:.1f}")
    print(f"   响应预览: {result['response']['content'][:200]}...")

    # 使用记忆系统
    print("\n[2] 测试记忆系统...")

    # 存储记忆
    memory = engine.add_memory(
        content="用户偏好简约、科技感的设计风格",
        memory_type=MemoryType.SEMANTIC,
        session_id=result['session_id']
    )
    print(f"   记忆已存储: {memory.id}")

    # 检索记忆
    memories = engine.recall_memories(
        query="设计风格",
        session_id=result['session_id']
    )
    print(f"   检索到 {len(memories)} 条相关记忆")

    # 创建快照
    print("\n[3] 创建系统快照...")
    snapshot = engine.create_snapshot(
        name="设计任务_001",
        description="科技海报设计任务快照",
        tags=["design", "poster"]
    )
    print(f"   快照已创建: {snapshot.id}")

    # 获取统计
    print("\n[4] 系统统计...")
    stats = engine.get_stats()
    print(f"   记忆条目: {stats['memory']['total_count']}")
    print(f"   会话数: {stats['sessions']['total_sessions']}")
    print(f"   快照数: {stats['snapshots']['total_snapshots']}")

    # 关闭引擎
    engine.shutdown()

    print("\n" + "=" * 60)
    print("基础示例完成!")
    print("=" * 60)


async def tool_example():
    """工具系统示例"""
    print("\n" + "=" * 60)
    print("工具系统示例")
    print("=" * 60)

    # 初始化工具注册表和执行器
    registry = ToolRegistry()
    executor = ToolExecutor(registry)

    # 注册自定义工具
    def generate_poster(prompt: str, style: str = "modern", size: str = "1024x1024") -> dict:
        """生成海报工具"""
        return {
            "status": "success",
            "prompt": prompt,
            "style": style,
            "size": size,
            "url": f"https://api.creagic.ai/generated/{hash(prompt)}.png"
        }

    registry.register(
        tool_def=ToolDefinition(
            name="generate_poster",
            description="根据提示词生成海报图片"
        ),
        implementation=generate_poster
    )

    # 执行工具
    print("\n[1] 执行海报生成工具...")

    result = await executor.execute(
        tool_name="generate_poster",
        arguments={
            "prompt": "科技公司年度盛典海报，未来感设计",
            "style": "futuristic",
            "size": "1920x1080"
        }
    )

    print(f"   执行状态: {'成功' if result.success else '失败'}")
    if result.success:
        print(f"   生成URL: {result.data['url']}")

    # 批量执行
    print("\n[2] 批量执行工具...")

    batch_results = await executor.batch_execute([
        {"tool_name": "generate_poster", "arguments": {"prompt": "海报1"}},
        {"tool_name": "generate_poster", "arguments": {"prompt": "海报2"}},
    ], parallel=True)

    print(f"   批量执行完成: {len(batch_results)} 个结果")

    print("\n" + "=" * 60)
    print("工具系统示例完成!")
    print("=" * 60)


async def validation_example():
    """验证系统示例"""
    print("\n" + "=" * 60)
    print("验证系统示例")
    print("=" * 60)

    # 初始化质量检查器
    checker = QualityChecker(min_score=70.0)

    # 设置品牌规范
    checker.set_brand_guidelines({
        "colors": ["#0066CC", "#00AAFF"],
        "styles": ["科技感", "简约"],
        "fonts": ["思源黑体", "Roboto"]
    })

    # 待验证的输出
    design_output = {
        "format": "png",
        "width": 1920,
        "height": 1080,
        "color_count": 8,
        "dominant_colors": ["#0066CC", "#FFFFFF"],
        "style": "科技感",
        "composition": {
            "subject_position": "center",
            "whitespace_ratio": 0.3
        }
    }

    # 执行验证
    print("\n[1] 执行质量检查...")

    result = await checker.check(
        output=design_output,
        context={"target_width": 1920, "target_height": 1080}
    )

    print(f"   综合得分: {result.score:.1f}")
    print(f"   是否通过: {'✓' if result.passed else '✗'}")

    # 详细检查结果
    print("\n[2] 各维度检查结果:")
    for check in result.checks:
        status = "✓" if check.passed else "✗"
        print(f"   {status} {check.name}: {check.score:.1f}分 - {check.message}")

    # 问题和建议
    if result.issues:
        print("\n[3] 发现的问题:")
        for issue in result.issues:
            print(f"   - [{issue['severity']}] {issue['message']}")

    if result.suggestions:
        print("\n[4] 改进建议:")
        for suggestion in result.suggestions:
            print(f"   - {suggestion}")

    print("\n" + "=" * 60)
    print("验证系统示例完成!")
    print("=" * 60)


async def memory_example():
    """记忆系统示例"""
    print("\n" + "=" * 60)
    print("记忆系统示例")
    print("=" * 60)

    from creagic.memory import MemoryManager, MemoryType

    # 初始化记忆管理器
    memory_manager = MemoryManager(
        max_entries=1000,
        embedding_provider=lambda texts: [[0.0] * 1536] * len(texts)
    )

    session_id = "demo_session_001"

    # 存储不同类型的记忆
    print("\n[1] 存储记忆...")

    memories = [
        ("用户偏好蓝色调的设计", MemoryType.SEMANTIC, 0.8),
        ("讨论了海报的布局方案", MemoryType.EPISODIC, 0.6),
        ("设计海报的标准流程: 需求分析 → 风格确定 → 生成 → 审核", MemoryType.PROCEDURAL, 0.9),
    ]

    for content, mem_type, importance in memories:
        memory = memory_manager.store(
            content=content,
            memory_type=mem_type,
            session_id=session_id,
            importance=importance
        )
        print(f"   存储 [{mem_type.value}]: {content[:30]}...")

    # 检索记忆
    print("\n[2] 检索相关记忆...")

    related = memory_manager.recall(
        query="设计风格和颜色",
        session_id=session_id,
        top_k=5
    )

    print(f"   找到 {len(related)} 条相关记忆:")
    for mem in related:
        print(f"   - [{mem.memory_type.value}] {mem.content[:40]}... (重要性: {mem.importance})")

    # 构建上下文
    print("\n[3] 构建对话上下文...")

    context = memory_manager.build_context(
        session_id=session_id,
        query="设计一个产品海报",
        system_prompt="你是一个专业的设计助手"
    )

    print(f"   系统提示词: {context.system_prompt[:30]}...")
    print(f"   相关记忆数: {len(context.memories)}")
    print(f"   最近消息数: {len(context.recent_messages)}")

    # 统计信息
    print("\n[4] 记忆统计...")
    stats = memory_manager.get_stats()
    print(f"   总记忆数: {stats.total_count}")
    print(f"   按类型: {stats.by_type}")
    print(f"   平均重要性: {stats.avg_importance:.2f}")

    print("\n" + "=" * 60)
    print("记忆系统示例完成!")
    print("=" * 60)


async def multi_agent_example():
    """多 Agent 系统示例"""
    print("\n" + "=" * 60)
    print("多 Agent 系统示例")
    print("=" * 60)

    from creagic.multi_agent import AgentTeam, AgentFactory, AgentCoordinator, CollaborationMode

    # 创建团队
    team = AgentTeam(name="设计团队", collaboration_mode=CollaborationMode.HIERARCHICAL)

    # 添加 Agent
    coordinator = AgentFactory.create_coordinator()
    executor = AgentFactory.create_design_agent()
    validator = AgentFactory.create_validator()

    team.add_agent(coordinator)
    team.add_agent(executor)
    team.add_agent(validator)

    print(f"\n[1] 团队创建完成:")
    print(f"   团队名称: {team.name}")
    print(f"   Agent 数量: {len(team.list_agents())}")

    # 查看团队成员
    print("\n[2] 团队成员:")
    for agent in team.list_agents():
        print(f"   - {agent.name} ({agent.role.value}): {agent.description[:30]}...")

    # 分发任务
    print("\n[3] 分发设计任务...")

    # 注意: 需要配置 LLM 提供者才能实际执行
    # results = await team.dispatch_task(
    #     "设计一个科技主题的社交媒体封面图",
    #     context={"theme": "科技", "platform": "微信"}
    # )

    # 团队统计
    print("\n[4] 团队统计:")
    stats = team.get_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")

    print("\n" + "=" * 60)
    print("多 Agent 系统示例完成!")
    print("=" * 60)


async def persistence_example():
    """持久化系统示例"""
    print("\n" + "=" * 60)
    print("持久化系统示例")
    print("=" * 60)

    from creagic.persistence import SessionStore, BackupManager, SnapshotManager
    import tempfile
    import shutil

    # 使用临时目录
    temp_dir = tempfile.mkdtemp()

    try:
        # 会话存储
        print("\n[1] 会话存储...")
        session_store = SessionStore(
            storage_type="file",
            storage_path=f"{temp_dir}/sessions"
        )

        session = session_store.create("user_001", "user_001", {"source": "demo"})
        session.add_message("user", "帮我设计一个logo")
        session.add_message("assistant", "好的，我来帮您设计logo。请问您有什么具体需求？")
        session_store.update(session)

        print(f"   会话创建: {session.session_id}")
        print(f"   消息数: {len(session.messages)}")

        # 获取会话
        loaded = session_store.get(session.session_id)
        print(f"   会话加载: {loaded is not None}")
        print(f"   加载消息数: {len(loaded.messages)}")

        # 快照
        print("\n[2] 快照管理...")
        snapshot_manager = SnapshotManager(storage_path=f"{temp_dir}/snapshots")

        snapshot = snapshot_manager.create(
            name="设计任务_v1",
            data={"session": session.to_dict(), "design_type": "logo"},
            description="logo设计初稿",
            tags=["logo", "design"]
        )

        print(f"   快照创建: {snapshot.id}")
        print(f"   快照名称: {snapshot.name}")

        # 列出快照
        snapshots = snapshot_manager.list()
        print(f"   快照列表: {len(snapshots)} 个")

        # 备份
        print("\n[3] 备份管理...")
        backup_manager = BackupManager(
            backup_dir=f"{temp_dir}/backups",
            max_backups=5
        )

        backup_manager.add_source(f"{temp_dir}/sessions")
        backup_path = backup_manager.backup_now()

        if backup_path:
            print(f"   备份创建: {backup_path}")

        # 列出备份
        backups = backup_manager.list_backups()
        print(f"   备份列表: {len(backups)} 个")

        print("\n" + "=" * 60)
        print("持久化系统示例完成!")
        print("=" * 60)

    finally:
        # 清理临时目录
        shutil.rmtree(temp_dir, ignore_errors=True)


async def main():
    """运行所有示例"""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 10 + "Creagic AI 策略工程框架完整示例" + " " * 10 + "║")
    print("╚" + "═" * 58 + "╝")

    # 运行各模块示例
    await memory_example()
    await validation_example()
    await tool_example()
    await multi_agent_example()
    await persistence_example()

    # 基础示例需要实际的 API Key
    # await basic_example()

    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 15 + "所有示例运行完成!" + " " * 18 + "║")
    print("╚" + "═" * 58 + "╝")
    print()


if __name__ == "__main__":
    asyncio.run(main())
