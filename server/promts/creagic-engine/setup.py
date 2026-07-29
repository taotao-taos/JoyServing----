"""
Creagic AI 策略工程框架安装配置
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("src/creagic/__init__.py", "r", encoding="utf-8") as fh:
    version = "1.0.0"
    for line in fh:
        if line.startswith("__version__"):
            version = line.split("=")[1].strip().strip('"').strip("'")
            break

setup(
    name="creagic-engine",
    version=version,
    author="Creagic AI",
    description="Creagic AI Strategy Engineering Framework - 大模型与业务API之间的智能编排层",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/creagic/creagic-engine",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=[
        # 核心依赖
    ],
    extras_require={
        "openai": ["openai>=1.0.0"],
        "anthropic": ["anthropic>=0.8.0"],
        "google": ["google-genai>=0.3.0"],
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
    },
    keywords=[
        "ai",
        "agent",
        "harness",
        "strategy-engineering",
        "design",
        "multi-agent",
        "llm",
        "openai",
        "creagic"
    ],
)
