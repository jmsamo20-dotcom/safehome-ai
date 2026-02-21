"""하위 호환 shim: plugins.kr.cross_validator re-export"""
from plugins.kr.cross_validator import (  # noqa: F401
    BUILDING_RISK_KEYWORDS,
    cross_validate,
    KRCrossValidator,
)
