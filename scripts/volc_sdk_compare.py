#!/usr/bin/env python3
"""
最小化火山引擎 SDK 对照脚本：
- 用官方 SDK 调 CVSync2AsyncGetResult
- 快速判断是签名/协议问题，还是平台侧抖动
"""

import argparse
import json
import os
import sys


def _read_env(name: str, required: bool = False, default: str = "") -> str:
    value = os.getenv(name, default).strip()
    if required and not value:
        raise ValueError(f"缺少环境变量: {name}")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Volcengine Python SDK 对照查询（CVSync2AsyncGetResult）"
    )
    parser.add_argument(
        "--task-id",
        default=os.getenv("VOLCENGINE_TASK_ID", "").strip(),
        help="任务 ID（可用 VOLCENGINE_TASK_ID 环境变量）",
    )
    parser.add_argument(
        "--req-key",
        default=os.getenv("VOLCENGINE_IMAGE_MODEL", "jimeng_seedream46_cvtob").strip(),
        help="req_key，必须与提交任务时一致",
    )
    args = parser.parse_args()

    try:
        ak = _read_env("VOLCENGINE_ACCESS_KEY", required=True)
        sk = _read_env("VOLCENGINE_SECRET_KEY", required=True)
        region = _read_env("VOLCENGINE_REGION", default="cn-north-1")
        task_id = args.task_id.strip()
        req_key = args.req_key.strip()
        if not task_id:
            raise ValueError("task_id 不能为空（请传 --task-id 或设置 VOLCENGINE_TASK_ID）")
        if not req_key:
            raise ValueError("req_key 不能为空（请传 --req-key 或设置 VOLCENGINE_IMAGE_MODEL）")
    except ValueError as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 2

    try:
        from volcengine.visual.VisualService import VisualService  # type: ignore
    except Exception as exc:
        print(
            "[error] 未安装 volcengine-python-sdk，请先执行: pip install volcengine-python-sdk",
            file=sys.stderr,
        )
        print(f"[detail] {exc}", file=sys.stderr)
        return 2

    visual_service = VisualService()
    visual_service.set_ak(ak)
    visual_service.set_sk(sk)
    # 公网默认域名；如需内网或代理可自行调整
    visual_service.set_host("visual.volcengineapi.com")

    params = {"req_key": req_key, "task_id": task_id}
    try:
        if hasattr(visual_service, "cv_sync2async_get_result"):
            resp = visual_service.cv_sync2async_get_result(params)
        elif hasattr(visual_service, "cv_sync2_async_get_result"):
            resp = visual_service.cv_sync2_async_get_result(params)
        else:
            raise RuntimeError("当前 VisualService 不支持 CVSync2AsyncGetResult")
    except Exception as exc:
        print("[error] SDK 调用失败", file=sys.stderr)
        print(f"[detail] {exc}", file=sys.stderr)
        return 1

    print(json.dumps(resp, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
