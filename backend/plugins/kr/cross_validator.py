"""
다중 문서 교차 검증 모듈 (한국)
계약서 + 등기부등본 + 건축물대장 간 불일치/위험 탐지
"""

import re
import logging
from models.schemas import CrossCheckItem, CrossCheckStatus
from core.interfaces import ICrossValidator

logger = logging.getLogger(__name__)

# 건축물대장 위험 키워드
BUILDING_RISK_KEYWORDS = [
    "위반건축물", "무단증축", "무단 용도변경", "근린생활시설",
    "고시원", "방쪼개기", "가구수 무단", "불법 건축",
]


def cross_validate(
    contract_text: str | None,
    registry_text: str | None,
    building_text: str | None,
    extracted: dict | None = None,
) -> list[CrossCheckItem]:
    """문서 간 교차 검증 수행"""
    checks: list[CrossCheckItem] = []

    if not contract_text:
        return checks

    # ── 1. 계약서 ↔ 등기부: 임대인 = 소유자 ──
    if registry_text and extracted:
        landlord_name = extracted.get("landlord", {}).get("name", "")
        owner_name = extracted.get("registry", {}).get("owner", "")

        if landlord_name and owner_name:
            # 이름에서 마스킹 제거하고 비교 (OO, ** 등)
            clean_landlord = re.sub(r"[O*]{1,2}", "", landlord_name).strip()
            clean_owner = re.sub(r"[O*]{1,2}", "", owner_name).strip()

            if clean_landlord and clean_owner:
                # 소유자 문자열에 임대인 이름이 포함되어 있으면 일치
                if clean_landlord in clean_owner:
                    checks.append(CrossCheckItem(
                        label="임대인 = 등기부 소유자",
                        status=CrossCheckStatus.OK,
                        detail="일치 확인됨",
                        source="계약서 ↔ 등기부",
                    ))
                else:
                    checks.append(CrossCheckItem(
                        label="임대인 ≠ 등기부 소유자",
                        status=CrossCheckStatus.DANGER,
                        detail=f"계약서 임대인({landlord_name})과 등기부 소유자({owner_name})가 다릅니다. 대리인 계약이거나 사기 가능성이 있습니다.",
                        source="계약서 ↔ 등기부",
                    ))

    # ── 2. 계약서 ↔ 등기부: 깡통전세 계산 ──
    if registry_text and extracted:
        deposit_str = extracted.get("money", {}).get("deposit", "")
        rights_str = extracted.get("registry", {}).get("rights_summary", "")

        deposit_amount = _parse_korean_amount(deposit_str)
        mortgage_amount = _extract_mortgage_total(rights_str)

        if deposit_amount > 0 and mortgage_amount > 0:
            total_claims = deposit_amount + mortgage_amount
            # 보수적 추정: 시세를 알 수 없으므로 근저당+보증금 비율로 판단
            ratio = mortgage_amount / deposit_amount

            if ratio >= 1.2:
                checks.append(CrossCheckItem(
                    label="깡통전세 위험",
                    status=CrossCheckStatus.DANGER,
                    detail=f"근저당({_format_amount(mortgage_amount)})이 보증금({_format_amount(deposit_amount)})보다 많습니다. 경매 시 보증금 회수 불가능.",
                    source="계약서 보증금 ↔ 등기부 근저당",
                ))
            elif ratio >= 0.5:
                checks.append(CrossCheckItem(
                    label="근저당 비율 주의",
                    status=CrossCheckStatus.WARNING,
                    detail=f"근저당({_format_amount(mortgage_amount)}) + 보증금({_format_amount(deposit_amount)}) 합계가 높습니다. 전세보증보험 가입 여부를 확인하세요.",
                    source="계약서 보증금 ↔ 등기부 근저당",
                ))
            else:
                checks.append(CrossCheckItem(
                    label="근저당 비율 양호",
                    status=CrossCheckStatus.OK,
                    detail=f"근저당({_format_amount(mortgage_amount)})이 보증금 대비 안전한 수준입니다.",
                    source="계약서 보증금 ↔ 등기부 근저당",
                ))
        elif deposit_amount > 0 and mortgage_amount == 0 and registry_text:
            checks.append(CrossCheckItem(
                label="근저당 없음",
                status=CrossCheckStatus.OK,
                detail="등기부에 근저당이 설정되어 있지 않습니다.",
                source="등기부",
            ))

    # ── 3. 등기부: 가압류/신탁 여부 ──
    if registry_text:
        has_seizure = any(kw in registry_text for kw in ["가압류", "압류", "가처분"])
        if has_seizure:
            checks.append(CrossCheckItem(
                label="압류/가압류 존재",
                status=CrossCheckStatus.DANGER,
                detail="등기부에 압류 또는 가압류가 설정되어 있습니다. 경매 위험이 있습니다.",
                source="등기부",
            ))

        has_trust = any(kw in registry_text for kw in ["신탁", "수탁자", "위탁자"])
        if has_trust:
            checks.append(CrossCheckItem(
                label="신탁등기 감지",
                status=CrossCheckStatus.DANGER,
                detail="신탁등기가 설정되어 있습니다. 신탁원부와 수익권자 동의서를 반드시 확인하세요.",
                source="등기부",
            ))

    # ── 4. 건축물대장 위험 키워드 ──
    if building_text:
        found_keywords = [kw for kw in BUILDING_RISK_KEYWORDS if kw in building_text]
        if found_keywords:
            checks.append(CrossCheckItem(
                label="건축물대장 위험 감지",
                status=CrossCheckStatus.DANGER,
                detail=f"건축물대장에서 위험 키워드 발견: {', '.join(found_keywords)}. 전세자금대출 및 보증보험 가입이 거절될 수 있습니다.",
                source="건축물대장",
            ))
        else:
            checks.append(CrossCheckItem(
                label="건축물대장 정상",
                status=CrossCheckStatus.OK,
                detail="건축물대장에서 위반 사항이 발견되지 않았습니다.",
                source="건축물대장",
            ))

    # 제공된 서류 조합에 따른 안내
    if not registry_text:
        checks.append(CrossCheckItem(
            label="등기부등본 미제출",
            status=CrossCheckStatus.WARNING,
            detail="등기부등본을 함께 업로드하면 임대인 확인, 깡통전세 판정 등 교차 검증이 가능합니다.",
            source="안내",
        ))
    if not building_text:
        checks.append(CrossCheckItem(
            label="건축물대장 미제출",
            status=CrossCheckStatus.WARNING,
            detail="건축물대장을 함께 업로드하면 위반건축물 여부를 확인할 수 있습니다.",
            source="안내",
        ))

    return checks


def _parse_korean_amount(text: str) -> int:
    """한국어 금액 표현을 원 단위 정수로 변환"""
    if not text:
        return 0
    text = text.replace(",", "").replace(" ", "")
    total = 0

    # "3억 6,000만원" / "2억 5000만원" / "5000만원" 패턴
    m_eok = re.search(r"(\d+)억", text)
    m_man = re.search(r"(\d+)만", text)

    if m_eok:
        total += int(m_eok.group(1)) * 100_000_000
    if m_man:
        total += int(m_man.group(1)) * 10_000

    # 순수 숫자 (예: "360,000,000원")
    if total == 0:
        m_num = re.search(r"(\d{6,})", text.replace(",", ""))
        if m_num:
            total = int(m_num.group(1))

    return total


def _extract_mortgage_total(rights_summary: str) -> int:
    """등기부 권리요약에서 근저당 총액 추출"""
    if not rights_summary:
        return 0

    total = 0
    # "채권최고액 1억 8,000만원" 또는 "채권최고액 금 360,000,000원" 패턴
    for m in re.finditer(r"채권최고액[^/]*?(\d[\d,억만원 ]+)", rights_summary):
        amount = _parse_korean_amount(m.group(1))
        total += amount

    # 근저당 + 금액 패턴
    if total == 0:
        for m in re.finditer(r"근저당[^/]*?(\d[\d,억만원 ]+)", rights_summary):
            amount = _parse_korean_amount(m.group(1))
            total += amount

    return total


def _format_amount(amount: int) -> str:
    """원 단위 정수를 한국어 금액 표현으로 변환"""
    if amount >= 100_000_000:
        eok = amount // 100_000_000
        man = (amount % 100_000_000) // 10_000
        if man > 0:
            return f"{eok}억 {man:,}만원"
        return f"{eok}억원"
    elif amount >= 10_000:
        return f"{amount // 10_000:,}만원"
    else:
        return f"{amount:,}원"


# ── 어댑터: ICrossValidator 인터페이스 구현 ──

class KRCrossValidator(ICrossValidator):
    """한국 교차 검증 서비스 (어댑터)"""

    def validate(
        self,
        contract_text: str | None,
        registry_text: str | None,
        building_text: str | None,
        extracted: dict | None,
    ) -> list[CrossCheckItem]:
        return cross_validate(contract_text, registry_text, building_text, extracted)
