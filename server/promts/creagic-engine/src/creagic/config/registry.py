"""
LLM 提供商注册表
"""

import hashlib
import os
from typing import Any, Dict, List, Optional, Callable
from abc import ABC, abstractmethod


def fallback_embeddings(texts: List[str], dim: int = 1536) -> List[List[float]]:
    """嵌入 API 不可用时占位向量，保证记忆模块仍可运行。"""
    out: List[List[float]] = []
    for text in texts:
        seed = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
        vec: List[float] = []
        while len(vec) < dim:
            for b in seed:
                vec.append((b / 127.5) - 1.0)
                if len(vec) >= dim:
                    break
            seed = hashlib.sha256(seed).digest()
        out.append(vec[:dim])
    return out


class BaseLLMProvider(ABC):
    """LLM 提供商基类"""

    def __init__(self, api_key: str, model: str, **kwargs):
        self.api_key = api_key
        self.model = model
        self.config = kwargs

    @abstractmethod
    def generate(self, messages: list, **kwargs) -> str:
        """生成文本"""
        pass

    @abstractmethod
    async def agenerate(self, messages: list, **kwargs) -> str:
        """异步生成文本"""
        pass

    @abstractmethod
    def embeddings(self, texts: list) -> list:
        """获取文本嵌入"""
        pass

    def get_usage(self) -> Dict[str, Any]:
        """获取使用统计"""
        return {"total_tokens": 0, "prompt_tokens": 0, "completion_tokens": 0}


class OpenAIProvider(BaseLLMProvider):
    """OpenAI 提供商"""

    def __init__(self, api_key: str, model: str = "gpt-4o", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.client = None

    def _get_client(self):
        if self.client is None:
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError("请安装 openai: pip install openai")
        return self.client

    def generate(self, messages: list, **kwargs) -> str:
        client = self._get_client()
        response = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 4096)
        )
        return response.choices[0].message.content

    async def agenerate(self, messages: list, **kwargs) -> str:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 4096)
        )
        return response.choices[0].message.content

    def embeddings(self, texts: list) -> list:
        client = self._get_client()
        response = client.embeddings.create(
            model=self.config.get("embedding_model", "text-embedding-3-small"),
            input=texts
        )
        return [item.embedding for item in response.data]


class AnthropicProvider(BaseLLMProvider):
    """Anthropic (Claude) 提供商"""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.client = None

    def _get_client(self):
        if self.client is None:
            try:
                from anthropic import Anthropic
                self.client = Anthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError("请安装 anthropic: pip install anthropic")
        return self.client

    def generate(self, messages: list, **kwargs) -> str:
        client = self._get_client()

        # 转换消息格式
        system = ""
        converted_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                converted_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        response = client.messages.create(
            model=self.model,
            system=system,
            messages=converted_messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 4096)
        )
        return response.content[0].text

    async def agenerate(self, messages: list, **kwargs) -> str:
        return self.generate(messages, **kwargs)

    def embeddings(self, texts: list) -> list:
        raise NotImplementedError("Anthropic 暂不支持嵌入 API")


class GoogleProvider(BaseLLMProvider):
    """Google Gemini 提供商"""

    def __init__(self, api_key: str, model: str = "gemini-pro", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.client = None

    def _get_client(self):
        if self.client is None:
            try:
                import google.genai as genai
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(self.model)
            except ImportError:
                raise ImportError("请安装 google-genai: pip install google-genai")
        return self.client

    def generate(self, messages: list, **kwargs) -> str:
        client = self._get_client()

        # 合并所有消息为单一内容
        content = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])

        response = client.generate_content(
            contents=content,
            generation_config={
                "temperature": kwargs.get("temperature", 0.7),
                "max_output_tokens": kwargs.get("max_tokens", 4096)
            }
        )
        return response.text

    async def agenerate(self, messages: list, **kwargs) -> str:
        return self.generate(messages, **kwargs)

    def embeddings(self, texts: list) -> list:
        try:
            import google.genai as genai
            genai.configure(api_key=self.api_key)
            return [genai.embed_content(model="models/embedding-001", content=t)["embedding"] for t in texts]
        except Exception:
            raise NotImplementedError("Google 嵌入 API 暂不可用")


class LocalProvider(BaseLLMProvider):
    """本地 LLM 提供商 (Ollama, LM Studio 等)"""

    def __init__(self, api_key: str = "", model: str = "llama3", base_url: str = "http://localhost:11434", **kwargs):
        super().__init__(api_key, model, base_url=base_url, **kwargs)
        self.base_url = base_url

    def generate(self, messages: list, **kwargs) -> str:
        import requests

        # 转换消息格式
        converted_messages = []
        for msg in messages:
            if msg["role"] != "system":
                converted_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        response = requests.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": converted_messages,
                "stream": False
            },
            timeout=kwargs.get("timeout", 120)
        )
        response.raise_for_status()
        return response.json()["message"]["content"]

    async def agenerate(self, messages: list, **kwargs) -> str:
        return self.generate(messages, **kwargs)

    def embeddings(self, texts: list) -> list:
        import requests

        embeddings = []
        for text in texts:
            response = requests.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text}
            )
            response.raise_for_status()
            embeddings.append(response.json()["embedding"])

        return embeddings


class AihubmixOpenAIProvider(BaseLLMProvider):
    """OpenAI 兼容 Chat/Embeddings（AIhubMix 等），base_url 与 Node 侧 AIHUBMIX_BASE_URL 一致。"""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", **kwargs):
        super().__init__(api_key, model, **kwargs)
        self.base_url = (
            kwargs.get("base_url")
            or os.environ.get("AIHUBMIX_BASE_URL", "https://aihubmix.com/v1")
        ).rstrip("/")

    def _sync_client(self):
        from openai import OpenAI

        return OpenAI(api_key=self.api_key or "unused", base_url=self.base_url)

    def _async_client(self):
        from openai import AsyncOpenAI

        return AsyncOpenAI(api_key=self.api_key or "unused", base_url=self.base_url)

    def generate(self, messages: list, **kwargs) -> str:
        client = self._sync_client()
        r = client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 4096),
        )
        if not r.choices:
            return ""
        return r.choices[0].message.content or ""

    async def agenerate(self, messages: list, **kwargs) -> str:
        client = self._async_client()
        r = await client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 4096),
        )
        if not r.choices:
            return ""
        return r.choices[0].message.content or ""

    def embeddings(self, texts: list) -> list:
        if not texts:
            return []
        try:
            client = self._sync_client()
            model = self.config.get("embedding_model", "text-embedding-3-small")
            r = client.embeddings.create(model=model, input=texts)
            return [d.embedding for d in r.data]
        except Exception:
            return fallback_embeddings(texts)


class DisabledLLMProvider(BaseLLMProvider):
    """无 API 密钥时占位：记忆/会话/工具注册仍可用，生成类接口返回空。"""

    def generate(self, messages: list, **kwargs) -> str:
        return ""

    async def agenerate(self, messages: list, **kwargs) -> str:
        return ""

    def embeddings(self, texts: list) -> list:
        return fallback_embeddings(texts)


class ProviderRegistry:
    """
    LLM 提供商注册表
    支持动态注册和获取提供商
    """

    _providers: Dict[str, Callable] = {
        "openai": OpenAIProvider,
        "aihubmix": AihubmixOpenAIProvider,
        "disabled": DisabledLLMProvider,
        "anthropic": AnthropicProvider,
        "google": GoogleProvider,
        "gemini": GoogleProvider,
        "local": LocalProvider,
    }

    _custom_providers: Dict[str, Callable] = {}

    @classmethod
    def register(cls, name: str, provider_class: type):
        """注册自定义提供商"""
        cls._custom_providers[name] = provider_class

    @classmethod
    def get(cls, name: str) -> Optional[type]:
        """获取提供商类"""
        return cls._custom_providers.get(name) or cls._providers.get(name)

    @classmethod
    def list_providers(cls) -> list:
        """列出所有提供商"""
        return list(set(cls._providers.keys()) | set(cls._custom_providers.keys()))

    @classmethod
    def create(cls, provider_name: str, api_key: str, model: str = None, **kwargs) -> BaseLLMProvider:
        """创建提供商实例"""
        provider_class = cls.get(provider_name)
        if not provider_class:
            raise ValueError(f"未知的提供商: {provider_name}")

        # 默认模型映射
        default_models = {
            "openai": "gpt-4o",
            "aihubmix": "gpt-4o-mini",
            "disabled": "noop",
            "anthropic": "claude-3-5-sonnet-20241022",
            "google": "gemini-pro",
            "gemini": "gemini-pro",
            "local": "llama3",
        }

        if model is None:
            model = default_models.get(provider_name, "gpt-4o")

        return provider_class(api_key=api_key, model=model, **kwargs)
