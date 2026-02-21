import type { AnalysisResult } from "./types";

/**
 * 샘플 0: A등급 - 안전한 계약서
 * 심사 비교용: "안전한 계약은 이렇게 보입니다"
 */
export const SAMPLE_SAFE: AnalysisResult = {
  grade: "A",
  score: 95,
  detected_risks: [],
  extracted: {
    landlord: {
      name: "최OO",
      id_hint: "780510-1******",
      address: "서울특별시 서초구 반포동 12-3",
    },
    tenant: {
      name: "한OO",
      id_hint: "970223-2******",
      address: "서울특별시 강남구 대치동 45-6",
    },
    property: {
      address: "서울특별시 서초구 반포동 12-3 OO아파트",
      unit: "제102동 제805호",
    },
    money: {
      deposit: "4억원 (전세)",
      rent: "없음",
      maintenance_fee: "월 30만원",
      payment_day: "매월 25일",
    },
    term: {
      start_date: "2026-04-01",
      end_date: "2028-03-31",
    },
    registry: {
      owner: "최OO (2019.03.15 소유권이전 - 매매)",
      rights_summary: "을구 사항 없음 (근저당·가압류·신탁 없음)",
    },
  },
  simulation: {
    deposit_amount: "4억원",
    recovery_rate: 98,
    risk_factors: [],
    safe_factors: [
      "선순위 채권 없음 (근저당·가압류 0원)",
      "소유자 7년 이상 보유 (안정적)",
      "전세보증보험 가입 가능",
      "임대차 기간 2년 충족",
    ],
  },
  document_type: "혼합",
  summary:
    "전반적으로 안전한 계약입니다. 등기부에 근저당이나 가압류가 없고, 계약 조건도 법적 기준을 충족합니다.",
  disclaimer:
    "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. 정확한 판단을 위해 법률 전문가 상담을 권장합니다. (이 결과는 샘플 데이터입니다)",
};

/**
 * 샘플 1: D등급 - 주의 필요한 계약서
 * 가압류 + 즉시명도 + 2년 미만 + 보증보험 거부
 */
export const SAMPLE_CAUTION: AnalysisResult = {
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
        "보증금을 돌려받지 못한 상태에서도 즉시 집을 비워줘야 한다는 조항입니다. 주택임대차보호법의 근간을 흔드는 매우 위험한 독소 조항입니다.",
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
  extracted: {
    landlord: {
      name: "김OO",
      id_hint: "800101-1******",
      address: "서울특별시 강남구 역삼동 123-45",
    },
    tenant: {
      name: "이OO",
      id_hint: "950315-2******",
      address: "서울특별시 마포구 합정동 67-89",
    },
    property: {
      address: "서울특별시 강남구 역삼동 123-45 OO빌라",
      unit: "제3층 제301호",
    },
    money: {
      deposit: "2억 5,000만원",
      rent: "월 50만원",
      maintenance_fee: "월 10만원",
      payment_day: "매월 25일",
    },
    term: {
      start_date: "2026-03-01",
      end_date: "2027-02-28",
    },
    registry: {
      owner: "김OO",
      rights_summary:
        "을구 제1호 근저당 OO은행 채권최고액 1억 8,000만원 / 을구 제3호 가압류 OO캐피탈 채권금액 5,000만원",
    },
  },
  simulation: {
    deposit_amount: "2억 5,000만원",
    recovery_rate: 32,
    risk_factors: [
      "근저당 1억 8,000만원 (은행이 먼저 가져감)",
      "가압류 5,000만원 (추가 채권 존재)",
      "전세보증보험 가입 불가 (임대인 거부)",
    ],
    safe_factors: [
      "전입신고 + 확정일자 확보 시 대항력 가능",
    ],
  },
  document_type: "혼합",
  summary:
    "매우 위험한 계약입니다. 가압류가 설정되어 있고, 즉시 명도 동의 강요 조항이 포함되어 있습니다. 이 계약은 재고하시기 바랍니다.",
  disclaimer:
    "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. 정확한 판단을 위해 법률 전문가 상담을 권장합니다. (이 결과는 샘플 데이터입니다)",
};

/**
 * 샘플 2: F등급 - 갭투자 전세사기 패턴
 * 실제 2023~2024 전세사기 사건에서 빈번하게 나타난 유형
 */
export const SAMPLE_FRAUD: AnalysisResult = {
  grade: "F",
  score: 8,
  detected_risks: [
    {
      risk_id: "C-6",
      risk_name: "당일 권리 변동 (갭투자 의심)",
      category: "registry",
      severity: 10,
      matched_text:
        "...갑구 제5호 소유권이전 2026년 2월 15일 접수 매매 / 본 임대차계약일 2026년 2월 15일...",
      explanation:
        "집주인이 집을 산 당일에 전세 계약을 맺고 있습니다. 이것은 '갭투자'의 전형적인 수법입니다. 전입신고 효력은 다음 날부터 발생하지만, 대출(근저당)은 당일 설정되므로 내 보증금이 후순위가 될 수 있습니다.",
      suggestion:
        "계약일에 소유권 변동이 있으면 잔금을 치르지 마세요. 최소 1주일 후 등기부를 재확인하고, 법률 전문가 상담을 받으세요.",
    },
    {
      risk_id: "C-4",
      risk_name: "과다 근저당 (깡통전세)",
      category: "registry",
      severity: 10,
      matched_text:
        "...을구 제1호 근저당권설정 채권최고액 금 360,000,000원 채무자 박OO 근저당권자 OO은행...",
      explanation:
        "근저당(대출 담보)이 3억 6천만원 설정되어 있는데, 전세 보증금이 2억 8천만원입니다. 합산하면 집값(약 4억)을 훨씬 초과합니다. 경매 시 은행이 먼저 가져가므로 보증금을 한 푼도 못 돌려받을 수 있습니다.",
      suggestion:
        "근저당 금액 + 보증금이 시세의 70%를 초과하면 깡통전세입니다. 전세보증보험 가입이 가능한지 먼저 확인하세요.",
    },
    {
      risk_id: "B-2",
      risk_name: "우선변제권 포기 강요",
      category: "special",
      severity: 10,
      matched_text:
        "...임차인은 본 부동산에 대한 일체의 이의를 제기하지 아니하며 후순위임을 인정한다...",
      explanation:
        "세입자의 보증금을 우선적으로 돌려받을 권리를 포기하라는 독소 조항입니다. '일체의 이의를 제기하지 않는다'는 표현으로 교묘하게 숨겨져 있습니다. 이런 조항을 넣으려는 것 자체가 사기 징후입니다.",
      suggestion:
        "절대 동의하지 마세요. 우선변제권 포기 조항은 법적으로 무효이며, 이런 조항이 있다면 계약을 즉시 중단하세요.",
    },
    {
      risk_id: "B-6",
      risk_name: "강제집행 동의 조항",
      category: "special",
      severity: 10,
      matched_text:
        "...임차인은 계약 종료 시 별도의 명도 소송 없이 자진 퇴거하며 강제집행에 동의한다...",
      explanation:
        "보증금을 돌려받지 못해도 소송 없이 바로 쫓겨날 수 있다는 조항입니다. '강제집행에 동의한다'는 표현은 세입자의 마지막 보호막마저 없애는 것입니다.",
      suggestion:
        "특약: '임대인은 보증금 전액 반환 완료 전까지 명도를 요구할 수 없다.'",
    },
    {
      risk_id: "B-5",
      risk_name: "보증보험 가입 거부",
      category: "special",
      severity: 9,
      matched_text:
        "...전세보증금반환보증 관련 일체의 서류 제공 및 협조 불가...",
      explanation:
        "전세보증보험에 가입하려면 임대인의 협조가 필요한데, 이를 거부하고 있습니다. 최근 전세사기범들은 보증보험 가입이 안 되는 매물만 골라 사기를 칩니다.",
      suggestion:
        "보증보험 가입 거부는 매우 위험한 신호입니다. 이 물건은 계약하지 마세요.",
    },
  ],
  extracted: {
    landlord: {
      name: "박OO",
      id_hint: "750420-1******",
      address: "경기도 수원시 영통구 OO동 456-78",
    },
    tenant: {
      name: "정OO",
      id_hint: "980712-1******",
      address: "서울특별시 송파구 잠실동 12-34",
    },
    property: {
      address: "경기도 화성시 동탄2신도시 OO아파트",
      unit: "제105동 제1203호",
    },
    money: {
      deposit: "2억 8,000만원 (전세)",
      rent: "없음",
      maintenance_fee: "월 25만원",
      payment_day: "확인 불가",
    },
    term: {
      start_date: "2026-02-15",
      end_date: "2028-02-14",
    },
    registry: {
      owner: "박OO (2026.02.15 소유권이전 - 매매 당일)",
      rights_summary:
        "을구 제1호 근저당 OO은행 채권최고액 3억 6,000만원 (2026.02.15 설정 - 계약 당일)",
    },
  },
  simulation: {
    deposit_amount: "2억 8,000만원",
    recovery_rate: 0,
    risk_factors: [
      "근저당 3억 6,000만원 (보증금보다 많음 = 깡통전세)",
      "매매 당일 전세계약 (갭투자 패턴)",
      "전세보증보험 가입 불가 (임대인 거부)",
      "우선변제권 포기 조항 (법적 무효이나 사기 징후)",
    ],
    safe_factors: [],
  },
  document_type: "혼합",
  summary:
    "매우 위험한 계약입니다. 이 계약은 전형적인 갭투자 전세사기 패턴을 보이고 있습니다. 소유권 이전 당일 전세 계약, 과다 근저당(깡통전세), 우선변제권 포기 강요, 강제집행 동의 조항이 모두 포함되어 있습니다. 즉시 계약을 중단하세요.",
  disclaimer:
    "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. 정확한 판단을 위해 법률 전문가 상담을 권장합니다. (이 결과는 실제 전세사기 패턴을 기반으로 한 샘플 데이터입니다)",
};

/** 하위 호환용 */
export const SAMPLE_RESULT = SAMPLE_CAUTION;
