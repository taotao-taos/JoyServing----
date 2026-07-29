"""
Creagic Python 侧车 HTTP API（FastAPI）
供 Node / Vite 中间件调用：记忆、会话、工具、规划、质检、多 Agent、快照。
"""

from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .core.engine import CreagicEngine, EngineConfig
from .memory.types import MemoryType

logger = logging.getLogger(__name__)

_engine: Optional[CreagicEngine] = None


def _build_engine_config() -> EngineConfig:
    key = (os.environ.get("AIHUBMIX_API_KEY") or "").strip()
    provider = os.environ.get("CREAGIC_LLM_PROVIDER", "aihubmix" if key else "disabled")
    model = os.environ.get("CREAGIC_LLM_MODEL") or os.environ.get(
        "AIHUBMIX_MODEL_FLASH", "gpt-4o-mini"
    )
    storage = os.environ.get("CREAGIC_STORAGE_PATH", "./data/creagic").rstrip("/")
    session_backend = os.environ.get("CREAGIC_SESSION_STORAGE", "file")
    return EngineConfig(
        llm_provider=provider,
        api_key=key,
        llm_model=model,
        storage_path=storage,
        session_storage_type=session_backend,
        enable_auto_backup=os.environ.get("CREAGIC_AUTO_BACKUP", "true").lower()
        in ("1", "true", "yes"),
    )


def get_engine() -> CreagicEngine:
    global _engine
    if _engine is None:
        cfg = _build_engine_config()
        Path = __import__("pathlib").Path
        Path(cfg.storage_path).mkdir(parents=True, exist_ok=True)
        _engine = CreagicEngine(cfg)
        _patch_tool_implementations(_engine)
    return _engine


def _patch_tool_implementations(engine: CreagicEngine) -> None:
    """设计工具在侧车内返回「委派」结构，由 Node 执行真实生图等。"""

    async def generate_image_stub(prompt: str, style: str = "modern", **kwargs: Any):
        return {
            "delegate_to": "node",
            "action": "generate_image",
            "prompt": prompt,
            "style": style,
            "size": kwargs.get("size", "1024x1024"),
            "quality": kwargs.get("quality", "standard"),
        }

    async def edit_image_stub(image_url: str, instruction: str, **kwargs: Any):
        return {
            "delegate_to": "node",
            "action": "edit_image",
            "image_url": image_url,
            "instruction": instruction,
        }

    reg = engine.tool_registry
    for name, impl in (
        ("generate_image", generate_image_stub),
        ("edit_image", edit_image_stub),
    ):
        td = reg.get(name)
        if td:
            reg.register(td, impl, overwrite=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_engine()
    yield
    global _engine
    if _engine:
        _engine.shutdown()
        _engine = None


app = FastAPI(title="Creagic Engine API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CREAGIC_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    eng = get_engine()
    return {"ok": True, "llm_provider": eng.config.llm_provider, "storage": eng.config.storage_path}


# --- Sessions ---


class SessionCreateBody(BaseModel):
    session_id: Optional[str] = None
    user_id: str = "anonymous"
    metadata: Dict[str, Any] = Field(default_factory=dict)


@app.post("/sessions")
def create_session(body: SessionCreateBody):
    eng = get_engine()
    sid = body.session_id or str(uuid.uuid4())
    existing = eng.session_store.get(sid)
    if existing:
        return {"session": existing.to_dict(), "created": False}
    s = eng.session_store.create(sid, body.user_id, metadata=body.metadata)
    return {"session": s.to_dict(), "created": True}


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    eng = get_engine()
    s = eng.session_store.get(session_id)
    if not s:
        raise HTTPException(404, "session not found")
    return s.to_dict()


class SessionPatchBody(BaseModel):
    messages: Optional[List[Dict[str, Any]]] = None
    context: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@app.patch("/sessions/{session_id}")
def patch_session(session_id: str, body: SessionPatchBody):
    eng = get_engine()
    s = eng.session_store.get(session_id)
    if not s:
        raise HTTPException(404, "session not found")
    if body.messages is not None:
        s.messages = body.messages
    if body.context is not None:
        s.context.update(body.context)
    if body.metadata is not None:
        s.metadata.update(body.metadata)
    eng.session_store.update(s)
    return s.to_dict()


@app.get("/sessions")
def list_sessions(user_id: Optional[str] = Query(None), limit: int = 50):
    eng = get_engine()
    rows = eng.session_store.list(user_id=user_id, limit=limit)
    return {"sessions": [s.to_dict() for s in rows]}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    eng = get_engine()
    if not eng.session_store.delete(session_id):
        raise HTTPException(404, "session not found")
    return {"ok": True}


# --- Engine: memory ---


class PrepareBody(BaseModel):
    session_id: str
    query: str
    user_id: str = "anonymous"
    top_k: int = 5


def _format_memory_context(entries) -> str:
    from .memory.types import MemoryEntry

    by_type: Dict[str, List[str]] = {}
    for e in entries:
        if not isinstance(e, MemoryEntry):
            continue
        k = e.memory_type.value
        by_type.setdefault(k, []).append(e.content[:800])
    parts = []
    for label, lines in by_type.items():
        parts.append(f"### {label}\n" + "\n".join(f"- {t}" for t in lines[:5]))
    return "\n\n".join(parts) if parts else ""


@app.post("/engine/prepare")
def engine_prepare(body: PrepareBody):
    eng = get_engine()
    if not eng.session_store.get(body.session_id):
        eng.session_store.create(body.session_id, body.user_id)
    related = eng.memory_manager.recall(
        query=body.query, session_id=body.session_id, top_k=body.top_k
    )
    ctx = eng.memory_manager.build_context(
        session_id=body.session_id,
        query=body.query,
        system_prompt="",
        constraints={},
    )
    block = _format_memory_context(related + [m for m in ctx.memories if m not in related])
    return {
        "memory_context": block,
        "memories_used": len(related),
        "session_id": body.session_id,
    }


class PostprocessBody(BaseModel):
    session_id: str
    user_id: str = "anonymous"
    user_text: str = ""
    assistant_text: str = ""


@app.post("/engine/postprocess")
def engine_postprocess(body: PostprocessBody):
    eng = get_engine()
    s = eng.session_store.get(body.session_id)
    if not s:
        eng.session_store.create(body.session_id, body.user_id)
        s = eng.session_store.get(body.session_id)
    if s and body.user_text:
        s.add_message("user", body.user_text[:12000])
    if s and body.assistant_text:
        s.add_message("assistant", body.assistant_text[:120000])
    if s:
        eng.session_store.update(s)
    if body.user_text.strip():
        eng.memory_manager.store(
            content=body.user_text[:4000],
            memory_type=MemoryType.EPISODIC,
            session_id=body.session_id,
            importance=0.55,
        )
    if body.assistant_text.strip():
        eng.memory_manager.store(
            content=body.assistant_text[:6000],
            memory_type=MemoryType.SEMANTIC,
            session_id=body.session_id,
            importance=0.45,
        )
    return {"ok": True}


# --- Tools ---


@app.get("/tools/openai")
def tools_openai():
    eng = get_engine()
    defs = eng.tool_registry.generate_definitions("openai")
    tools = [
        {
            "type": "function",
            "function": {
                "name": d["name"],
                "description": d.get("description", ""),
                "parameters": d.get("parameters", {"type": "object", "properties": {}}),
            },
        }
        for d in defs
    ]
    return {"tools": tools}


class ToolExecuteBody(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    require_approval: bool = False
    user_id: Optional[str] = None


@app.post("/tools/execute")
async def tools_execute(body: ToolExecuteBody):
    eng = get_engine()
    res = await eng.tool_executor.execute(
        body.tool_name,
        body.arguments,
        user_id=body.user_id,
        require_approval=body.require_approval,
    )
    return {
        "success": res.success,
        "data": res.data,
        "error": res.error,
        "metadata": res.metadata,
    }


class ToolApproveBody(BaseModel):
    approval_id: str


@app.post("/tools/approve")
async def tools_approve(body: ToolApproveBody):
    eng = get_engine()
    res = await eng.tool_executor.approve(body.approval_id)
    return {
        "success": res.success,
        "data": res.data,
        "error": res.error,
        "metadata": res.metadata,
    }


# --- Planning ---


class PlanBody(BaseModel):
    task: str
    session_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


@app.post("/engine/plan")
def engine_plan(body: PlanBody):
    eng = get_engine()
    names = [t.name for t in eng.tool_registry.list_tools()]
    plan = eng.task_planner.create_plan(
        task=body.task, context=body.context, available_tools=names
    )
    d = plan.to_dict()
    d["ready_for_image"] = any(
        "生成" in (s.get("name") or "") or "视觉" in (s.get("description") or "")
        for s in d.get("steps", [])
    )
    return d


# --- Validation ---


class ValidateBody(BaseModel):
    html: str
    context: Dict[str, Any] = Field(default_factory=dict)


@app.post("/engine/validate")
async def engine_validate(body: ValidateBody):
    eng = get_engine()
    result = await eng.quality_checker.check(output=body.html, context=body.context)
    fixed_output, fix_records = await eng.auto_fixer.fix(
        body.html, result, body.context
    )
    return {
        "validation": result.to_dict(),
        "fix_suggestion": {"output": fixed_output, "records": fix_records},
    }


# --- Multi-agent ---


class MultiAgentBody(BaseModel):
    task_input: str
    workflow: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)
    require_approval: bool = False


@app.post("/engine/multi-agent")
async def engine_multi_agent(body: MultiAgentBody):
    eng = get_engine()
    out = await eng.coordinator.process(
        task_input=body.task_input,
        workflow=body.workflow,
        context=body.context,
        require_approval=body.require_approval,
    )
    agents = [a.name for a in eng.agent_team.list_agents()]
    return {"result": out, "agents_involved": agents, "routing": body.workflow or "default"}


# --- Snapshots ---


class SnapshotCreateBody(BaseModel):
    name: str
    description: str = ""
    tags: List[str] = Field(default_factory=list)


@app.post("/snapshots")
def snapshot_create(body: SnapshotCreateBody):
    eng = get_engine()
    snap = eng.create_snapshot(body.name, body.description, body.tags)
    return snap.to_dict()


@app.get("/snapshots")
def snapshot_list():
    eng = get_engine()
    return {
        "snapshots": [s.to_dict() for s in eng.snapshot_manager.list(limit=100)]
    }


@app.post("/snapshots/{snapshot_id}/restore")
def snapshot_restore(snapshot_id: str):
    eng = get_engine()
    ok = eng.restore_snapshot(snapshot_id)
    if not ok:
        raise HTTPException(404, "snapshot not found or restore failed")
    return {"ok": True}


@app.get("/stats")
def stats():
    return get_engine().get_stats()
