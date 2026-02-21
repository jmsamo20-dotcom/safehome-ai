"use client";

import { useState } from "react";

// ── Mock 데이터 (API 연결 전) ──
const MOCK_RESULT = {
  grade: "D" as const,
  score: 35,
  summary:
    "주의가 필요한 계약입니다. 문제 조항을 반드시 수정한 후 계약하세요.",
  detected_risks: [
    {
      risk_id: "C-1",
      risk_name: "압류/가압류/가처분",
      category: "registry",
      severity: 10,
      matched_text:
        "...부동산 갑구 제5호: 2025.12.10 가압류 서울중앙지법...",
      explanation:
        "등기부에 가압류가 설정되어 있습니다. 경매로 넘어갈 경우 보증금을 돌려받기 매우 어렵습니다.",
      suggestion:
        "가압류가 있는 물건은 계약하지 마세요. 경매 시 보증금 회수가 매우 어렵습니다.",
    },
    {
      risk_id: "B-5",
      risk_name: "보증보험 가입 협조 거부",
      category: "special",
      severity: 9,
      matched_text: "...특약: 임대인은 전세보증보험 가입에 협조하지 않는다...",
      explanation:
        "전세보증보험에 가입할 수 없으면, 임대인이 보증금을 반환하지 않을 때 보호받을 방법이 없습니다.",
      suggestion:
        "특약: '임대인은 임차인의 전세보증금반환보증 가입에 적극 협조한다.'",
    },
    {
      risk_id: "A-3",
      risk_name: "임대차 기간 2년 미만",
      category: "contract",
      severity: 6,
      matched_text: "임대차 기간: 12개월",
      explanation:
        "주택임대차보호법상 최소 2년이 보장되는데, 1년으로 계약하면 갱신 요구권이 약해집니다.",
      suggestion:
        "특약: '본 계약의 임대차 기간은 2년으로 하며, 임차인은 주택임대차보호법에 따른 갱신요구권을 보유한다.'",
    },
  ],
  disclaimer:
    "본 분석은 AI 기반 참고 정보이며, 법률 자문이 아닙니다. 정확한 판단을 위해 법률 전문가 상담을 권장합니다.",
};

const GRADE_COLORS: Record<string, { bg: string; text: string; label: string }> =
  {
    A: { bg: "bg-green-100", text: "text-green-700", label: "안전" },
    B: { bg: "bg-green-50", text: "text-green-600", label: "양호" },
    C: { bg: "bg-yellow-50", text: "text-yellow-700", label: "보통" },
    D: { bg: "bg-orange-50", text: "text-orange-700", label: "주의" },
    E: { bg: "bg-red-50", text: "text-red-600", label: "위험" },
    F: { bg: "bg-red-100", text: "text-red-700", label: "매우 위험" },
  };

export default function ResultPage() {
  const result = MOCK_RESULT;
  const gradeStyle = GRADE_COLORS[result.grade];
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="pb-8">
      {/* ── 위험도 등급 (Top Section) ── */}
      <div
        className={`${gradeStyle.bg} rounded-2xl p-6 text-center mb-6`}
      >
        <p className="text-sm text-gray-500 mb-1">위험도 등급</p>
        <div
          className={`text-6xl font-black ${gradeStyle.text} mb-1`}
        >
          {result.grade}
        </div>
        <p className={`text-lg font-semibold ${gradeStyle.text}`}>
          {gradeStyle.label}
        </p>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                result.score >= 70
                  ? "bg-green-500"
                  : result.score >= 40
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            안전 점수: {result.score}/100
          </p>
        </div>
      </div>

      {/* ── 쉬운 말 요약 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">요약</h3>
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* ── 위험 조항 리스트 ── */}
      <h3 className="font-semibold text-gray-900 mb-3">
        탐지된 위험 요소 ({result.detected_risks.length}건)
      </h3>

      <div className="space-y-4 mb-6">
        {result.detected_risks.map((risk) => (
          <div
            key={risk.risk_id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* 헤더 */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold ${
                    risk.severity >= 9
                      ? "bg-red-100 text-red-700"
                      : risk.severity >= 6
                      ? "bg-orange-100 text-orange-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {risk.severity >= 9
                    ? "위험"
                    : risk.severity >= 6
                    ? "주의"
                    : "참고"}
                </span>
                <span className="font-semibold text-gray-900 text-sm">
                  {risk.risk_name}
                </span>
              </div>
              <span className="text-xs text-gray-400">{risk.risk_id}</span>
            </div>

            {/* 매칭된 원문 */}
            <div className="px-4 py-3 bg-red-50/50">
              <p className="text-xs text-gray-500 mb-1">계약서 원문</p>
              <p className="text-sm text-red-800 font-mono">
                {risk.matched_text}
              </p>
            </div>

            {/* 설명 */}
            <div className="px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {risk.explanation}
              </p>
            </div>

            {/* 수정 특약 제안 */}
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-blue-600 font-semibold mb-1">
                    수정 특약 제안
                  </p>
                  <p className="text-sm text-blue-900">{risk.suggestion}</p>
                </div>
                <button
                  onClick={() => handleCopy(risk.suggestion, risk.risk_id)}
                  className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                >
                  {copiedId === risk.risk_id ? "복사됨!" : "복사"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 면책 고지 ── */}
      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
