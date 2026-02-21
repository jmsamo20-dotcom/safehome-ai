"""
세이프홈 AI - 표준 위험 스키마 (Standard SafeHome Risk Index)
국가별 위험 코드를 범용 코드로 매핑하여 글로벌 비교 가능
"""

from enum import Enum


class StandardRiskCode(str, Enum):
    """SSRI (Standard SafeHome Risk Index) - 범용 위험 코드"""

    SSRI_001 = "SSRI-001"  # 소유자 불일치
    SSRI_002 = "SSRI-002"  # 전대차 위험
    SSRI_003 = "SSRI-003"  # 과다 담보 부채
    SSRI_004 = "SSRI-004"  # 보증금 표기 불일치
    SSRI_005 = "SSRI-005"  # 법적 권리 포기 강요
    SSRI_006 = "SSRI-006"  # 강제 퇴거 조항
    SSRI_007 = "SSRI-007"  # 압류/가압류
    SSRI_008 = "SSRI-008"  # 신탁 부담
    SSRI_009 = "SSRI-009"  # 선순위 임차 청구권
    SSRI_010 = "SSRI-010"  # 단기 계약
    SSRI_011 = "SSRI-011"  # 세금 체납 전가
    SSRI_012 = "SSRI-012"  # 위반 건축물
    SSRI_013 = "SSRI-013"  # 보증보험 거부
    SSRI_014 = "SSRI-014"  # 유지보수 전가
    SSRI_015 = "SSRI-015"  # 당일 권리 변동
    SSRI_999 = "SSRI-999"  # 국가 고유 위험 (범용 매핑 없음)
