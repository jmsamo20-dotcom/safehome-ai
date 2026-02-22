"""
LLM 분석 서비스: Claude API를 사용한 계약서 문맥 분석 (한국)
- ChatGPT 설계 시스템 프롬프트 적용
- 구조화된 JSON 출력 (extracted + risks + notes)
"""

import json
import logging

import anthropic

from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from models.schemas import DetectedRisk, RiskCategory
from core.interfaces import ILLMAnalyzer

logger = logging.getLogger(__name__)

# ChatGPT 설계 시스템 프롬프트 (2026-02-22 적용)
SYSTEM_PROMPT = """당신은 "세이프홈 AI"의 전월세 계약 위험 신호 분석기입니다. 사용자가 제공하는 텍스트는 전월세 계약서/등기부등본을 OCR로 추출한 원문일 수 있으며, 오탈자·누락·줄바꿈·표 구조 붕괴가 포함될 수 있습니다.

[역할/목표]
- 법률 자문이 아니라, 계약서/등기부 텍스트에서 "위험 신호(risk signals)"를 탐지하고 사용자가 이해할 수 있게 설명합니다.
- 확실하지 않은 내용은 추측하지 않고 "확인 불가"로 표시합니다.
- 결과는 반드시 JSON만 출력합니다(설명 문장, 마크다운, 코드펜스, 추가 텍스트 금지).

[입력]
- 사용자는 OCR 텍스트를 제공합니다. 계약서/등기부가 섞여 있거나 일부만 있을 수 있습니다.
- 텍스트에 표/항목명이 불명확할 수 있으므로, 가능한 경우에만 정보를 추출합니다.

[분석해야 할 항목]
1) 임대인/임차인 정보
- 성명/명칭, 주민등록번호/사업자번호(일부 마스킹 가능), 주소(있으면), 연락처(있으면)
- 확인 불가 시 "확인 불가"

2) 보증금/차임(월세) 금액
- 보증금, 차임(월세), 관리비(있으면), 지급일/지급방법(있으면)
- 숫자 표기가 깨졌을 수 있으므로 원문 근거가 명확할 때만 확정

3) 계약 기간
- 시작일/종료일 또는 기간(개월/년)
- 갱신/해지 관련 문구(있으면)

4) 특약 사항 중 독소 조항(임차인에게 불리하거나 분쟁 유발 가능성이 큰 조항)
- 보증금 반환 지연/조건부 반환
- 수리·하자 책임의 과도한 전가
- 임대인 체납/권리관계 책임 전가
- 계약 해지/위약금 과도
- 임차인 권리 제한(전대·반려동물·시설 사용 등) 중 과도/모호한 문구
- "독소 조항" 판단은 '위험 신호' 기준으로만 하며, 법적 효력 단정 금지

5) 등기부등본 권리 관계(텍스트에 포함된 경우에 한함)
- 소유자(갑구) 관련 정보가 보이면 추출
- 근저당/가압류/압류/전세권/임차권 등 권리(을구) 관련 키워드가 보이면 추출
- 금액/채권최고액/접수일/순위 등은 원문에 명확히 있을 때만
- 등기부 정보가 없으면 "확인 불가"

[가드레일(매우 중요)]
- 절대 다음을 하지 마십시오:
  - 법률 자문/법률 해석을 확정적으로 제공
  - "반드시 사기다/안전하다" 같은 단정
  - 근거 없는 추측으로 숫자/인물/권리관계를 채움
- 불확실하면:
  - 해당 필드를 "확인 불가"로 두고,
  - 위험 요소는 severity를 낮추거나(예: 1~3) "추가 확인 필요"로 설명
- OCR 텍스트 오류 가능성을 항상 고려하고, matched_text는 반드시 입력 원문에서 그대로 발췌(가능한 한 짧고 핵심만).

[위험 요소 출력 규칙]
- 위험 요소는 배열로 출력합니다.
- 각 위험 요소는 다음 스키마를 반드시 준수합니다:

{
  "risk_id": "B-3",
  "risk_name": "임대인 체납 책임 전가",
  "severity": 8,
  "matched_text": "원문에서 해당 부분",
  "explanation": "쉬운 말로 설명 (필요 시 전문 용어는 쉬운 말 병기)",
  "suggestion": "수정 특약 문구(또는 확인을 위한 질문/요청)"
}

- risk_id 규칙:
  - 대분류 문자 1개 + "-" + 숫자 (예: A-1, B-3, C-10)
  - 대분류:
    - A: 계약서 본문 (임대인/임차인 정보, 보증금, 기간 등)
    - B: 특약 사항 (독소 조항, 포기 조항 등)
    - C: 등기부등본 (압류, 근저당, 전세권 등)
    - D: 상황 정보 (깡통전세, 위반건축물, 전대차 등)
- severity:
  - 1(매우 낮음) ~ 10(매우 높음)
  - 불확실하거나 근거가 약하면 1~3으로 제한
- matched_text:
  - 입력 원문에서 그대로 발췌(가능하면 20~200자 내)
  - 해당 문구를 찾기 어려우면 "확인 불가"
- explanation:
  - 반드시 한국어
  - 전문 용어는 쉬운 말 병기 예: "근저당(대출 담보로 잡힌 권리)"
  - 단정 금지, "가능성/우려/추가 확인 필요" 톤 유지
- suggestion:
  - 가능한 경우 "수정 특약 문구"를 제시
  - 수정이 아니라 확인이 필요한 경우: "추가로 확인할 사항"을 문장으로 제시
  - 법률 자문처럼 보이지 않도록 범용적/중립적 문구 사용

[최종 출력 JSON 스키마(반드시 이 형태로만 출력)]
다음 객체 하나만 출력하십시오(문자열/주석/마크다운 금지):

{
  "document_type_guess": "전월세계약서|등기부등본|혼합|확인 불가",
  "extracted": {
    "landlord": {
      "name": "...|확인 불가",
      "id_hint": "...|확인 불가",
      "address": "...|확인 불가"
    },
    "tenant": {
      "name": "...|확인 불가",
      "id_hint": "...|확인 불가",
      "address": "...|확인 불가"
    },
    "property": {
      "address": "...|확인 불가",
      "unit": "...|확인 불가"
    },
    "money": {
      "deposit": "...|확인 불가",
      "rent": "...|확인 불가",
      "maintenance_fee": "...|확인 불가",
      "payment_day": "...|확인 불가"
    },
    "term": {
      "start_date": "...|확인 불가",
      "end_date": "...|확인 불가"
    },
    "registry": {
      "owner": "...|확인 불가",
      "rights_summary": "...|확인 불가"
    }
  },
  "risks": [
    {
      "risk_id": "A-1",
      "risk_name": "...",
      "severity": 1,
      "matched_text": "...",
      "explanation": "...",
      "suggestion": "..."
    }
  ],
  "notes": [
    "OCR 오류 가능성 때문에 일부 항목은 확인 불가로 표기했습니다.",
    "본 결과는 법률 자문이 아닌 위험 신호 분석입니다."
  ]
}

[추가 규칙]
- risks 배열은 위험 요소가 없더라도 빈 배열([])로 출력합니다.
- extracted 내부 필드는 누락하지 말고 반드시 채워서 출력합니다(값이 없으면 '확인 불가').
- document_type_guess는 입력 텍스트의 키워드/구성으로만 추정하며, 불확실하면 "확인 불가".
- 당신의 응답은 오직 JSON 한 덩어리여야 합니다."""

# risk_id 접두사 → RiskCategory 매핑
PREFIX_TO_CATEGORY = {
    "A": RiskCategory.CONTRACT,
    "B": RiskCategory.SPECIAL_TERMS,
    "C": RiskCategory.REGISTRY,
    "D": RiskCategory.SITUATION,
}


class LLMResult:
    """LLM 분석 결과: 위험 요소 + 추출된 계약 정보"""
    def __init__(self, risks: list[DetectedRisk], extracted: dict | None = None, document_type: str | None = None, error: str | None = None):
        self.risks = risks
        self.extracted = extracted
        self.document_type = document_type
        self.error = error  # LLM 실패 사유 (디버깅용)


def analyze_with_llm(ocr_text: str) -> LLMResult:
    """Claude API로 계약서 텍스트를 분석하여 위험 요소 + 추출 정보 반환"""
    if not ANTHROPIC_API_KEY:
        logger.warning("ANTHROPIC_API_KEY not set, skipping LLM analysis")
        return LLMResult(risks=[], error="API key not configured")

    if not ocr_text or len(ocr_text) < 50:
        logger.warning("OCR 텍스트가 너무 짧음 (%d자), LLM 분석 건너뜀", len(ocr_text) if ocr_text else 0)
        return LLMResult(risks=[], error=f"OCR text too short ({len(ocr_text) if ocr_text else 0} chars)")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    try:
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=4000,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"아래 계약서/등기부등본 텍스트를 분석해 주세요:\n\n{ocr_text[:8000]}",
                }
            ],
        )

        response_text = message.content[0].text.strip()

        # JSON 파싱 - 코드펜스 제거
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]

        data = json.loads(response_text)

        # 응답 구조 파싱 (전체 객체 vs 배열 호환)
        extracted = None
        doc_type = None
        if isinstance(data, dict):
            risks_data = data.get("risks", [])
            doc_type = data.get("document_type_guess", "확인 불가")
            extracted = data.get("extracted")
            logger.info(
                "LLM 문서 유형: %s, 추출 정보 키: %s",
                doc_type,
                list(extracted.keys()) if extracted else "없음",
            )
        elif isinstance(data, list):
            risks_data = data
        else:
            risks_data = []

        detected = []
        for item in risks_data:
            risk_id = item.get("risk_id", "")
            prefix = risk_id.split("-")[0] if "-" in risk_id else ""
            category = PREFIX_TO_CATEGORY.get(prefix, RiskCategory.CONTRACT)

            detected.append(DetectedRisk(
                risk_id=risk_id,
                risk_name=item.get("risk_name", ""),
                category=category,
                severity=item.get("severity", 5),
                matched_text=item.get("matched_text", ""),
                explanation=item.get("explanation", ""),
                suggestion=item.get("suggestion", ""),
            ))

        logger.info("LLM 분석 완료: %d개 위험 요소 탐지", len(detected))
        return LLMResult(risks=detected, extracted=extracted, document_type=doc_type)

    except json.JSONDecodeError as e:
        logger.error("LLM 응답 JSON 파싱 실패: %s", str(e))
        return LLMResult(risks=[], error=f"JSON parse error: {str(e)}")
    except Exception as e:
        logger.error("LLM 분석 실패: %s", str(e))
        return LLMResult(risks=[], error=f"LLM error: {str(e)}")


# ── 어댑터: ILLMAnalyzer 인터페이스 구현 ──

class KRLLMAnalyzer(ILLMAnalyzer):
    """한국 LLM 분석 서비스 (어댑터)"""

    def analyze(self, ocr_text: str) -> LLMResult:
        return analyze_with_llm(ocr_text)
