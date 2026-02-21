"""하위 호환 shim: plugins.kr.rule_engine re-export"""
from plugins.kr.rule_engine import (  # noqa: F401
    KEYWORD_RULES,
    RISK_DEFINITIONS,
    detect_by_keywords,
    detect_contract_period,
    calculate_grade,
    build_analysis_result,
    F_TRIGGERS,
    E_TRIGGERS,
    D_TRIGGERS,
    KRRuleEngine,
)
