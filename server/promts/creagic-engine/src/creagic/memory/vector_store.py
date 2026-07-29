"""
向量存储 - 基于内存的向量数据库

提供向量相似度搜索功能
"""

import math
from typing import Any, Dict, List, Optional, Tuple
import json
from pathlib import Path


class VectorStore:
    """
    简单的内存向量存储

    使用余弦相似度进行向量检索
    生产环境建议使用: ChromaDB, Pinecone, Weaviate
    """

    def __init__(self, dimension: int = 1536, storage_path: Optional[str] = None):
        """
        初始化向量存储

        Args:
            dimension: 向量维度
            storage_path: 持久化存储路径
        """
        self.dimension = dimension
        self.storage_path = storage_path
        self._vectors: Dict[str, List[float]] = {}
        self._metadata: Dict[str, Dict[str, Any]] = {}

        if storage_path:
            self._load()

    def add(self, id: str, vector: List[float], metadata: Optional[Dict[str, Any]] = None):
        """
        添加向量

        Args:
            id: 向量 ID
            vector: 向量数据
            metadata: 关联元数据
        """
        if len(vector) != self.dimension:
            raise ValueError(f"向量维度必须为 {self.dimension}, 实际为 {len(vector)}")

        self._vectors[id] = vector
        self._metadata[id] = metadata or {}

    def get(self, id: str) -> Optional[Tuple[List[float], Dict[str, Any]]]:
        """
        获取向量

        Args:
            id: 向量 ID

        Returns:
            (向量, 元数据) 或 None
        """
        if id not in self._vectors:
            return None
        return self._vectors[id], self._metadata.get(id, {})

    def delete(self, id: str) -> bool:
        """删除向量"""
        if id in self._vectors:
            del self._vectors[id]
            if id in self._metadata:
                del self._metadata[id]
            return True
        return False

    def search(
        self,
        query_vector: List[float],
        top_k: int = 10,
        min_score: float = 0.0,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        搜索最相似的向量

        Args:
            query_vector: 查询向量
            top_k: 返回数量
            min_score: 最低相似度分数
            filter_metadata: 元数据过滤条件

        Returns:
            [(id, 相似度分数, 元数据), ...]
        """
        if len(query_vector) != self.dimension:
            raise ValueError(f"查询向量维度必须为 {self.dimension}")

        # 计算余弦相似度
        results = []
        for id, vector in self._vectors.items():
            # 元数据过滤
            if filter_metadata:
                metadata = self._metadata.get(id, {})
                if not self._match_metadata(metadata, filter_metadata):
                    continue

            score = self._cosine_similarity(query_vector, vector)
            if score >= min_score:
                results.append((id, score, self._metadata.get(id, {})))

        # 排序并返回 top_k
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """计算余弦相似度"""
        dot_product = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(a * a for a in v2))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def _match_metadata(self, metadata: Dict, filter_rules: Dict[str, Any]) -> bool:
        """检查元数据是否匹配过滤规则"""
        for key, value in filter_rules.items():
            if key not in metadata:
                return False
            if isinstance(value, list):
                if metadata[key] not in value:
                    return False
            elif metadata[key] != value:
                return False
        return True

    def save(self):
        """保存到磁盘"""
        if not self.storage_path:
            return

        path = Path(self.storage_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "dimension": self.dimension,
            "vectors": self._vectors,
            "metadata": self._metadata
        }

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f)

    def _load(self):
        """从磁盘加载"""
        path = Path(self.storage_path)
        if not path.exists():
            return

        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            self.dimension = data.get("dimension", self.dimension)
            self._vectors = data.get("vectors", {})
            self._metadata = data.get("metadata", {})
        except Exception:
            pass

    def count(self) -> int:
        """返回向量总数"""
        return len(self._vectors)

    def clear(self):
        """清空所有向量"""
        self._vectors.clear()
        self._metadata.clear()
