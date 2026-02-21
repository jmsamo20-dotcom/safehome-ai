import type { AnalysisResult } from "./types";

/**
 * 샘플 분석 결과: 위험 요소가 포함된 전월세 계약서 예시
 * 콘테스트 심사위원/사용자가 실제 계약서 없이 체험 가능
 */
export const SAMPLE_RESULT: AnalysisResult = {
  grade: "D",
  score: 38,
  detected_risks: [
    {
      risk_id: "C-1",
      risk_name: "가압류 설정",
      category: "registry",
      severity: 10,
      matched_text:
        "...을구 제3호 가압류 채권자 OO캐피탈 채권금액 금 50,000,000원...",
      explanation:
        "등기부에 가압류(돈을 빌려주고 못 받아서 법원에 신청한 압류)가 설정되어 있습니다. 이 물건이 경매로 넘어가면 보증금을 돌려받기 매우 어렵습니다.",
      suggestion:
        "가압류가 있는 물건은 계약하지 마세요. 경매 시 보증금 회수가 매우 어렵습니다.",
    },
    {
      risk_id: "B-6",
      risk_name: "즉시 명도 동의 강요",
      category: "special",
      severity: 10,
      matched_text:
        "...임차인은 계약 만료 시 제소전 화해에 동의하며 즉시 명도한다...",
      explanation:
        "보증금을 돌려받지 못한 상태에서도 즉시 집을 비워줘야 한다는 조항입니다. 이는 주택임대차보호법의 근간을 흔드는 매우 위험한 독소 조항입니다.",
      suggestion:
        "특약: '임대인은 보증금 전액 반환 완료 전까지 명도를 요구할 수 없다.' 이 조항이 있다면 계약을 재고하세요.",
    },
    {
      risk_id: "A-3",
      risk_name: "임대차 기간 2년 미만",
      category: "contract",
      severity: 6,
      matched_text: "임대차 기간 12개월",
      explanation:
        "주택임대차보호법상 최소 2년이 보장되는데, 1년으로 계약되어 있습니다. 갱신 요구권이 약해질 수 있습니다.",
      suggestion:
        "특약: '본 계약의 임대차 기간은 2년으로 하며, 임차인은 주택임대차보호법에 따른 갱신요구권을 보유한다.'",
    },
    {
      risk_id: "B-5",
      risk_name: "보증보험 가입 협조 거부",
      category: "special",
      severity: 9,
      matched_text:
        "...임대인은 전세보증금반환보증보험 가입에 협조할 의무가 없다...",
      explanation:
        "전세보증보험에 가입할 수 없으면, 임대인이 보증금을 돌려주지 않을 때 보호받을 방법이 없습니다.",
      suggestion:
        "특약: '임대인은 임차인의 전세보증금반환보증 가입에 적극 협조한다.'",
    },
  ],
  summary:
    "매우 위험한 계약입니다. 가압류가 설정되어 있고, 즉시 명도 동의 강요 조항이 포함되어 있습니다. 이 계약은 재고하시기 바랍니다.",
  disclaimer:
    "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. 정확한 판단을 위해 법률 전문가 상담을 권장합니다. (이 결과는 샘플 데이터입니다)",
};
