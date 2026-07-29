#!/usr/bin/env python3
"""
Liblib ComfyUI 提交 + 查询诊断（与 server/aiHandlers.ts 签名方式一致）。
默认模拟「质感增强」链路，templateUuid 取 LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID，否则 LIBLIB_COMFY_TEMPLATE_UUID。
用法：在项目根目录加载 .env 后执行：
  export $(grep -v '^#' .env | xargs)  # 可选
  python3 scripts/liblib_comfy_diagnose.py

依赖：pip install requests
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sys
import time
import uuid
from typing import Any
from urllib.parse import urlencode

try:
    import requests
except ImportError:
    print("请先安装: pip install requests", file=sys.stderr)
    sys.exit(1)

BASE = (os.getenv("LIBLIB_COMFY_BASE_URL") or "https://openapi.liblibai.cloud").rstrip("/")


def b64url_from_hmac(secret: str, message: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha1).digest()
    s = base64.b64encode(digest).decode("ascii")
    return s.replace("+", "-").replace("/", "_").rstrip("=")


def signed_url(path: str) -> str:
    ak = os.getenv("LIBLIB_COMFY_ACCESS_KEY") or os.getenv("LIBLIB_ACCESS_KEY") or ""
    sk = os.getenv("LIBLIB_COMFY_SECRET_KEY") or os.getenv("LIBLIB_SECRET_KEY") or ""
    if not ak or not sk:
        raise SystemExit("请设置 LIBLIB_COMFY_ACCESS_KEY 与 LIBLIB_COMFY_SECRET_KEY")
    ts = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex[:16]
    raw = f"{path}&{ts}&{nonce}"
    sig = b64url_from_hmac(sk, raw)
    sep = "&" if "?" in path else "?"
    q = urlencode(
        {
            "AccessKey": ak,
            "Signature": sig,
            "Timestamp": ts,
            "SignatureNonce": nonce,
        }
    )
    return f"{BASE}{path}{sep}{q}"


def pick_task_id(data: dict[str, Any]) -> str | None:
    d = data.get("data")
    if isinstance(d, dict):
        for k in ("generateUuid", "generate_uuid", "uuid"):
            v = d.get(k)
            if isinstance(v, str) and len(v) >= 8:
                return v
    for k in ("generateUuid", "generate_uuid"):
        v = data.get(k)
        if isinstance(v, str) and len(v) >= 8:
            return v
    return None


def main() -> None:
    # 与 server/aiHandlers.ts 一致：增强默认 templateUuid 与官方高清工作流 uuid 对齐
    _default_enhance_tpl = "c44f310cd0df4771be5bddfea6350c3a"
    shared = os.getenv("LIBLIB_COMFY_TEMPLATE_UUID")
    template = os.getenv("LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID") or shared or _default_enhance_tpl
    wf = (
        os.getenv("LIBLIB_COMFY_ENHANCE_WORKFLOW_UUID")
        or os.getenv("LIBLIB_COMFY_WORKFLOW_UUID")
        or "c44f310cd0df4771be5bddfea6350c3a"
    )
    mip = (
        os.getenv("LIBLIB_COMFY_ENHANCE_MODEL_INFO_PATH")
        or os.getenv("LIBLIB_COMFY_MODEL_INFO_PATH")
        or "27a99630c078483182e7b8fdd116a3a7"
    )
    img_node = os.getenv("LIBLIB_COMFY_ENHANCE_IMAGE_NODE_ID") or os.getenv("LIBLIB_COMFY_IMAGE_NODE_ID") or "131"
    lora_node = os.getenv("LIBLIB_COMFY_ENHANCE_LORA_NODE_ID") or os.getenv("LIBLIB_COMFY_LORA_NODE_ID") or "205"
    lora_name = os.getenv("LIBLIB_COMFY_ENHANCE_LORA_NAME", "0cf6cf2b87bc43f48603b5905dc6c2c5")
    strength = float(os.getenv("LIBLIB_COMFY_ENHANCE_LORA_STRENGTH_MODEL") or "1")
    test_url = os.getenv("TEST_IMAGE_URL") or "https://www.liblib.art/favicon.ico"

    if len(wf) != 32:
        print("请设置 LIBLIB_COMFY_ENHANCE_WORKFLOW_UUID（或 LIBLIB_COMFY_WORKFLOW_UUID），32 位", file=sys.stderr)
        sys.exit(1)

    payload = {
        "templateUuid": template,
        "generateParams": {
            "workflowUuid": wf,
            str(img_node): {
                "class_type": "LoadImage",
                "inputs": {"image": test_url},
            },
            str(lora_node): {
                "class_type": "LoraLoader",
                "inputs": {"lora_name": lora_name, "strength_model": strength},
            },
        },
    }
    if mip:
        payload["generateParams"]["modelInfoPath"] = mip

    url = signed_url("/api/generate/comfyui/app")
    print("POST", url[:120] + "…")
    print(json.dumps(payload, ensure_ascii=False, indent=2))

    r = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
    print("HTTP", r.status_code, r.text[:2000])

    try:
        j = r.json()
    except json.JSONDecodeError:
        sys.exit(1)

    if j.get("code") not in (0, 20000, 10000):
        print("业务失败:", j.get("msg"), "code=", j.get("code"))
        sys.exit(1)

    gid = pick_task_id(j)
    if not gid:
        print("未解析到 generateUuid，完整响应:", json.dumps(j, ensure_ascii=False)[:1500])
        sys.exit(1)

    print("generateUuid:", gid)

    qurl = signed_url("/api/generate/comfyui/status")
    for _ in range(40):
        time.sleep(2.5)
        qr = requests.post(qurl, json={"generateUuid": gid}, timeout=60)
        try:
            qj = qr.json()
        except json.JSONDecodeError:
            print(qr.text[:500])
            continue
        data = qj.get("data") if isinstance(qj.get("data"), dict) else {}
        st = data.get("generateStatus")
        print("poll generateStatus=", st, "code=", qj.get("code"))
        if st == 6:
            print("任务失败:", data.get("generateMsg") or qj.get("msg"))
            break
        if st == 5 and data.get("images"):
            print("成功:", json.dumps(data.get("images"), ensure_ascii=False)[:1200])
            break


if __name__ == "__main__":
    main()
