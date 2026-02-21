"""하위 호환 shim: plugins.kr.llm_analyzer re-export"""
from plugins.kr.llm_analyzer import (  # noqa: F401
    SYSTEM_PROMPT,
    PREFIX_TO_CATEGORY,
    LLMResult,
    analyze_with_llm,
    KRLLMAnalyzer,
)
