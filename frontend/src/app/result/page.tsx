"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult, ExtractedInfo, DepositSimulation, CrossCheckItem } from "@/lib/types";

const GRADE_COLORS: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  A: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "안전" },
  B: { bg: "bg-green-50", text: "text-green-600", border: "border-green-100", label: "양호" },
  C: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "보통" },
  D: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "주의" },
  E: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", label: "위험" },
  F: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "매우 위험" },
};

const GRADE_MESSAGES: Record<string, string> = {
  A: "현재 위험 신호는 낮습니다.",
  B: "대체로 안전하지만, 아래 참고 사항을 확인하세요.",
  C: "몇 가지 확인이 필요합니다.",
  D: "주의가 필요합니다. 계약 전 반드시 확인하세요.",
  E: "심각한 위험 신호가 감지되었습니다.",
  F: "전세사기 위험 신호가 다수 감지되었습니다.",
};

const GRADE_ACTIONS: Record<string, { icon: string; text: string; color: string }> = {
  A: { icon: "\u2705", text: "계약 진행 가능합니다.", color: "text-green-700" },
  B: { icon: "\u2705", text: "아래 참고 사항 확인 후 진행 권장합니다.", color: "text-green-600" },
  C: { icon: "\u26A0\uFE0F", text: "추가 확인 후 진행 권장합니다.", color: "text-yellow-700" },
  D: { icon: "\u26A0\uFE0F", text: "계약 전 특약 수정이 필요합니다.", color: "text-orange-700" },
  E: { icon: "\uD83D\uDED1", text: "법률 전문가 상담 후 결정하세요.", color: "text-red-600" },
  F: { icon: "\uD83D\uDEA8", text: "계약을 즉시 중단하세요.", color: "text-red-700" },
};

const RISK_LEGAL_BASIS: Record<string, string> = {
  "A-1": "민법 제563조",
  "A-2": "민법 관습법",
  "A-3": "주택임대차보호법 제4조",
  "A-4": "공동주택관리법 제31조",
  "B-1": "주택임대차보호법 제10조",
  "B-2": "주택임대차보호법 제10조 (강행규정)",
  "B-3": "국세기본법 제35조",
  "B-4": "민법 제623조",
  "B-5": "민간임대주택특별법 제49조",
  "B-6": "민사집행법 제56조",
  "C-1": "민사집행법",
  "C-2": "신탁법 제2조",
  "C-3": "주택임대차보호법 제3조의3",
  "C-4": "주택임대차보호법 (배당순위)",
  "C-5": "민법 제303조",
  "C-6": "민법 제186조",
  "D-1": "부동산거래신고법",
  "D-2": "건축법 제79조",
  "D-3": "민법 제114조",
  "D-4": "민법 제629조",
  "D-5": "국세기본법 제35조",
};

const CATEGORY_LABELS: Record<string, string> = {
  contract: "계약 조항",
  special: "특약 사항",
  registry: "등기부",
  situation: "상황 정보",
};

// SSRI 글로벌 표준 코드 라벨 (영문)
const SSRI_LABELS: Record<string, string> = {
  "SSRI-001": "Owner Mismatch",
  "SSRI-002": "Subletting Risk",
  "SSRI-003": "Excessive Secured Debt",
  "SSRI-004": "Deposit Discrepancy",
  "SSRI-005": "Coerced Rights Waiver",
  "SSRI-006": "Forced Eviction Clause",
  "SSRI-007": "Seizure / Attachment",
  "SSRI-008": "Trust Encumbrance",
  "SSRI-009": "Prior Tenant Claims",
  "SSRI-010": "Short-term Lease",
  "SSRI-011": "Tax Default Liability",
  "SSRI-012": "Building Code Violation",
  "SSRI-013": "Insurance Refusal",
  "SSRI-014": "Maintenance Burden Shift",
  "SSRI-015": "Same-day Rights Change",
  "SSRI-999": "Country-specific Risk",
};

function InfoValue({ value }: { value?: string }) {
  const isUnknown = !value || value === "확인 불가";
  return (
    <span className={isUnknown ? "text-gray-400" : "text-gray-900 font-medium"}>
      {isUnknown ? "확인 불가" : value}
    </span>
  );
}

function DepositSimulationCard({ sim }: { sim: DepositSimulation }) {
  const rate = sim.recovery_rate;
  const color =
    rate >= 80 ? "text-green-600" : rate >= 40 ? "text-yellow-600" : "text-red-600";
  const barColor =
    rate >= 80 ? "bg-green-500" : rate >= 40 ? "bg-yellow-500" : "bg-red-500";
  const bgColor =
    rate >= 80 ? "bg-green-50" : rate >= 40 ? "bg-yellow-50" : "bg-red-50";
  const borderColor =
    rate >= 80
      ? "border-green-200"
      : rate >= 40
      ? "border-yellow-200"
      : "border-red-200";

  return (
    <div
      className={`${bgColor} rounded-2xl border ${borderColor} p-5 mb-4 print-keep print-border`}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="font-bold text-gray-900">보증금 안전도 시뮬레이션</h3>
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-gray-500 mb-1">
          보증금 {sim.deposit_amount}
        </p>
        <div className={`text-4xl font-black ${color}`}>{rate}%</div>
        <p className="text-sm text-gray-600 mt-1">회수 가능성</p>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(3, rate)}%` }}
        />
      </div>

      {sim.risk_factors.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-red-700 mb-1.5">
            위험 요인
          </p>
          <ul className="space-y-1">
            {sim.risk_factors.map((f, i) => (
              <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">&#9888;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sim.safe_factors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-700 mb-1.5">
            안전 요인
          </p>
          <ul className="space-y-1">
            {sim.safe_factors.map((f, i) => (
              <li key={i} className="text-xs text-green-800 flex items-start gap-1.5">
                <span className="shrink-0 mt-0.5">&#10003;</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const CHECK_STATUS_STYLES: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  ok: { icon: "\u2714", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  warning: { icon: "\u26A0", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  danger: { icon: "\u2716", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const DOC_LABELS: Record<string, string> = {
  contract: "계약서",
  registry: "등기부등본",
  building: "건축물대장",
};

function CrossCheckSection({
  checks,
  documents,
}: {
  checks: CrossCheckItem[];
  documents?: string[];
}) {
  const okCount = checks.filter((c) => c.status === "ok").length;
  const dangerCount = checks.filter((c) => c.status === "danger").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 print-keep print-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <h3 className="font-bold text-gray-900">교차 검증 결과</h3>
        </div>
        {documents && documents.length > 0 && (
          <div className="flex gap-1">
            {documents.map((doc) => (
              <span
                key={doc}
                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full"
              >
                {DOC_LABELS[doc] || doc}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 요약 바 */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        {okCount > 0 && (
          <span className="text-green-600 font-semibold">
            {"\u2714"} {okCount}건 정상
          </span>
        )}
        {warningCount > 0 && (
          <span className="text-yellow-600 font-semibold">
            {"\u26A0"} {warningCount}건 미확인
          </span>
        )}
        {dangerCount > 0 && (
          <span className="text-red-600 font-semibold">
            {"\u2716"} {dangerCount}건 위험
          </span>
        )}
      </div>

      {/* 체크 항목 */}
      <div className="space-y-2">
        {checks.map((check, i) => {
          const style = CHECK_STATUS_STYLES[check.status] || CHECK_STATUS_STYLES.warning;
          return (
            <div
              key={i}
              className={`${style.bg} border ${style.border} rounded-xl p-3`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${style.text} ${
                    check.status === "ok"
                      ? "bg-green-100"
                      : check.status === "danger"
                      ? "bg-red-100"
                      : "bg-yellow-100"
                  }`}
                >
                  {style.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${style.text}`}>
                      {check.label}
                    </p>
                    {check.source && (
                      <span className="text-xs text-gray-400">
                        {check.source}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {check.detail}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExtractedInfoSection({ extracted }: { extracted: ExtractedInfo }) {
  const sections = [
    {
      title: "당사자",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      items: [
        { label: "임대인", value: extracted.landlord?.name },
        { label: "임차인", value: extracted.tenant?.name },
      ],
    },
    {
      title: "금액",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      items: [
        { label: "보증금", value: extracted.money?.deposit },
        { label: "월세", value: extracted.money?.rent },
        { label: "관리비", value: extracted.money?.maintenance_fee },
      ],
    },
    {
      title: "계약 기간",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      items: [
        { label: "시작일", value: extracted.term?.start_date },
        { label: "종료일", value: extracted.term?.end_date },
      ],
    },
    {
      title: "등기부 요약",
      icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      items: [
        { label: "소유자", value: extracted.registry?.owner },
        { label: "권리관계", value: extracted.registry?.rights_summary },
      ],
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-900 mb-3">AI가 읽은 계약 정보</h3>
      <div className="grid grid-cols-2 gap-3">
        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl border border-gray-200 p-3"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={section.icon}
                />
              </svg>
              <span className="text-xs font-semibold text-gray-500">
                {section.title}
              </span>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.label} className="text-xs">
                  <span className="text-gray-400">{item.label}: </span>
                  <InfoValue value={item.value} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {extracted.property?.address && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs">
            <span className="text-gray-400">물건 소재지: </span>
            <span className="text-gray-900 font-medium">
              {extracted.property.address}
              {extracted.property.unit && ` ${extracted.property.unit}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [expandedBasis, setExpandedBasis] = useState<string | null>(null);
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);
  const [ssriTooltip, setSsriTooltip] = useState<string | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    const storedResult = sessionStorage.getItem("safehome_result");
    const storedError = sessionStorage.getItem("safehome_error");
    const storedElapsed = sessionStorage.getItem("safehome_elapsed");

    if (storedElapsed) {
      setElapsedTime(storedElapsed);
      sessionStorage.removeItem("safehome_elapsed");
    }

    if (storedResult) {
      setResult(JSON.parse(storedResult));
      sessionStorage.removeItem("safehome_result");
      sessionStorage.removeItem("safehome_error");
    } else if (storedError) {
      setError(storedError);
      sessionStorage.removeItem("safehome_error");
    } else {
      router.push("/upload");
    }
  }, [router]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!result) return;
    const riskSummary = result.detected_risks
      .map((r) => `- [${r.risk_name}] ${r.explanation.slice(0, 50)}...`)
      .join("\n");
    try {
      await navigator.share({
        title: `세이프홈 AI 분석 결과: ${result.grade}등급`,
        text: `전월세 계약 위험도: ${result.grade}등급 (${result.score}/100)\n\n${result.summary}\n\n위험 요소 ${result.detected_risks.length}건:\n${riskSummary}\n\n세이프홈 AI로 분석하세요`,
      });
    } catch {
      // 사용자가 공유 취소한 경우
    }
  };

  // 에러 상태
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">!</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">분석 실패</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => router.push("/upload")}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  // 로딩 상태
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const gradeStyle = GRADE_COLORS[result.grade] || GRADE_COLORS.C;

  // 카테고리별 위험 요소 집계
  const categoryRisks = result.detected_risks.reduce(
    (acc, risk) => {
      const cat = risk.category || "contract";
      if (!acc[cat]) acc[cat] = { count: 0, maxSeverity: 0 };
      acc[cat].count++;
      acc[cat].maxSeverity = Math.max(acc[cat].maxSeverity, risk.severity);
      return acc;
    },
    {} as Record<string, { count: number; maxSeverity: number }>
  );

  return (
    <div className="pb-8">
      {/* 인쇄 전용 헤더 (화면에서는 숨김) */}
      <div className="hidden print-header mb-4">
        <div className="flex items-center justify-between border-b border-gray-300 pb-3">
          <div>
            <h1 className="text-lg font-bold">세이프홈 AI - 계약 리스크 분석 보고서</h1>
            <p className="text-xs text-gray-500">
              분석일: {new Date().toLocaleDateString("ko-KR")}
              {result.document_type && ` | 문서 유형: ${result.document_type}`}
            </p>
          </div>
          <div className={`text-3xl font-black ${gradeStyle.text}`}>
            {result.grade}등급
          </div>
        </div>
      </div>

      {/* ── AI 판정 배너 ── */}
      <div className={`rounded-xl p-3 mb-3 flex items-center justify-between ${
        result.grade === "A" || result.grade === "B"
          ? "bg-green-600"
          : result.grade === "C"
          ? "bg-yellow-600"
          : result.grade === "D"
          ? "bg-orange-600"
          : "bg-red-600"
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">
            {result.grade === "A" || result.grade === "B" ? "\u2705" : result.grade === "C" || result.grade === "D" ? "\u26A0\uFE0F" : "\uD83D\uDEA8"}
          </span>
          <div>
            <p className="text-white text-sm font-bold">
              AI 계약 판정: {
                result.grade === "A" || result.grade === "B"
                  ? "계약 진행 가능"
                  : result.grade === "C"
                  ? "추가 확인 필요"
                  : result.grade === "D"
                  ? "계약 전 수정 필요"
                  : result.grade === "E"
                  ? "계약 비추천"
                  : "즉시 계약 중단"
              }
            </p>
          </div>
        </div>
        {elapsedTime && (
          <span className="text-white/80 text-xs font-mono bg-white/20 px-2 py-1 rounded-lg">
            {elapsedTime}s
          </span>
        )}
      </div>

      {/* ── OCR 품질 경고 (등급 제한 시 강조) ── */}
      {result.ocr_grade_limited && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2.5">
          <span className="text-red-500 text-lg shrink-0 mt-0.5">{"\uD83D\uDED1"}</span>
          <div>
            <p className="text-sm font-semibold text-red-800">
              문서 인식 품질 부족 — 등급이 제한되었습니다
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              사진이 흐리거나 텍스트가 충분히 인식되지 않아,
              실제보다 안전하게 표시될 수 있습니다.
              선명한 사진으로 다시 분석해 주세요.
            </p>
            {result.ocr_confidence != null && (
              <p className="text-xs text-red-500 mt-1">
                인식률: {Math.round(result.ocr_confidence)}%
              </p>
            )}
            <button
              onClick={() => router.push("/upload")}
              className="no-print mt-2 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition"
            >
              다시 촬영하기
            </button>
          </div>
        </div>
      )}
      {!result.ocr_grade_limited && result.ocr_confidence != null && result.ocr_confidence < 60 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-lg shrink-0 mt-0.5">{"\u26A0\uFE0F"}</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              문서 인식률이 낮습니다 ({Math.round(result.ocr_confidence)}%)
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              일부 내용이 정확하지 않을 수 있습니다.
              밝은 곳에서 글자가 잘 보이도록 다시 촬영해 보세요.
            </p>
            <button
              onClick={() => router.push("/upload")}
              className="no-print mt-2 text-xs font-semibold text-amber-700 underline hover:text-amber-900"
            >
              다시 촬영하기
            </button>
          </div>
        </div>
      )}

      {/* ── [1] HERO: 등급 + 점수 + 요약 ── */}
      <div className={`${gradeStyle.bg} rounded-2xl p-6 text-center mb-4`}>
        <p className="text-sm text-gray-500 mb-1">위험도 등급</p>
        <div className={`text-6xl font-black ${gradeStyle.text} mb-1`}>
          {result.grade}
        </div>
        <p className={`text-lg font-semibold ${gradeStyle.text}`}>
          {gradeStyle.label}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          {GRADE_MESSAGES[result.grade]}
        </p>
        {/* AI 권장 행동 */}
        <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 ${GRADE_ACTIONS[result.grade]?.color || "text-gray-700"}`}>
          <span className="text-sm">{GRADE_ACTIONS[result.grade]?.icon}</span>
          <span className="text-xs font-bold">{GRADE_ACTIONS[result.grade]?.text}</span>
        </div>
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

      {/* 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* ── 보증금 회수 시뮬레이션 ── */}
      {result.simulation && (
        <DepositSimulationCard sim={result.simulation} />
      )}

      {/* ── 교차 검증 결과 ── */}
      {result.cross_checks && result.cross_checks.length > 0 && (
        <CrossCheckSection
          checks={result.cross_checks}
          documents={result.documents_analyzed}
        />
      )}

      {/* 카테고리별 위험도 바 */}
      {result.detected_risks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">
            카테고리별 위험도
          </h3>
          <div className="space-y-2">
            {Object.entries(categoryRisks).map(([cat, data]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      data.maxSeverity >= 9
                        ? "bg-red-500"
                        : data.maxSeverity >= 6
                        ? "bg-orange-400"
                        : "bg-yellow-400"
                    }`}
                    style={{
                      width: `${Math.min(100, data.maxSeverity * 10)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">
                  {data.count}건
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 스크롤 유도 버튼 */}
      {result.detected_risks.length > 0 && (
        <button
          onClick={() =>
            document
              .getElementById("risk-list")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className={`no-print w-full py-3 rounded-xl font-semibold transition mb-6 border ${gradeStyle.border} ${gradeStyle.bg} ${gradeStyle.text}`}
        >
          위험 요소 {result.detected_risks.length}건 확인하기
        </button>
      )}

      {/* ── [2] 위험 요소 리스트 ── */}
      {result.detected_risks.length > 0 && (
        <div id="risk-list">
          {/* 핵심 위험 TOP 3 */}
          {result.detected_risks.length > 1 && (
            <div className="bg-gray-900 rounded-xl p-4 mb-4 print-keep">
              <h3 className="text-xs font-semibold text-gray-400 mb-2">
                핵심 위험 요약
              </h3>
              <ul className="space-y-1.5">
                {[...result.detected_risks]
                  .sort((a, b) => b.severity - a.severity)
                  .slice(0, 3)
                  .map((risk, i) => (
                    <li key={risk.risk_id} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-white">{risk.risk_name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        심각도 {risk.severity}/10
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <h3 className="font-semibold text-gray-900 mb-3">
            탐지된 위험 요소 ({result.detected_risks.length}건)
          </h3>
          <div className="space-y-4 mb-2">
            {result.detected_risks
              .slice(0, showAllRisks ? undefined : 3)
              .map((risk) => (
              <div
                key={risk.risk_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden print-keep print-border"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
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
                  {risk.standard_risk_code && SSRI_LABELS[risk.standard_risk_code] && (
                    <div className="mt-1.5 relative">
                      <button
                        onClick={() => setSsriTooltip(ssriTooltip === risk.risk_id ? null : risk.risk_id)}
                        className="flex items-center gap-1.5 group"
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs text-indigo-600 font-medium group-hover:bg-indigo-100 transition">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {risk.standard_risk_code}
                        </span>
                        <span className="text-xs text-indigo-400">
                          {SSRI_LABELS[risk.standard_risk_code]}
                        </span>
                      </button>
                      {ssriTooltip === risk.risk_id && (
                        <div className="mt-1.5 p-2.5 bg-indigo-900 text-white rounded-lg text-xs leading-relaxed animate-in">
                          <p className="font-semibold mb-1">{risk.standard_risk_code}: {SSRI_LABELS[risk.standard_risk_code]}</p>
                          <p className="text-indigo-200">SSRI(Standard SafeHome Risk Index)는 국가별 위험 코드를 글로벌 표준으로 매핑합니다. 이 코드는 한국({risk.risk_id})뿐 아니라 일본, 미국 등 다른 국가에서도 동일하게 적용됩니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 bg-red-50/50">
                  <p className="text-xs text-gray-500 mb-1">계약서 원문</p>
                  <p className="text-sm text-red-800 font-mono">
                    {risk.matched_text}
                  </p>
                </div>

                <div className="px-4 py-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {risk.explanation}
                  </p>
                </div>

                {/* AI 분석 근거 보기 */}
                <div className="px-4 border-t border-gray-100">
                  <button
                    onClick={() =>
                      setExpandedBasis(
                        expandedBasis === risk.risk_id ? null : risk.risk_id
                      )
                    }
                    className="no-print w-full py-2 flex items-center justify-between text-xs text-gray-500 hover:text-gray-700 transition"
                  >
                    <span>AI 분석 근거 보기</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${
                        expandedBasis === risk.risk_id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedBasis === risk.risk_id && (
                    <div className="pb-3 space-y-1.5 text-xs">
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0 w-16">탐지 방식</span>
                        <span className="text-gray-700 font-medium">
                          {risk.risk_id.startsWith("A") || risk.risk_id.startsWith("B")
                            ? "키워드 매칭 + LLM 문맥 분석"
                            : risk.risk_id.startsWith("C")
                            ? "등기부 키워드 매칭"
                            : "상황 키워드 매칭"}
                        </span>
                      </div>
                      {RISK_LEGAL_BASIS[risk.risk_id] && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 shrink-0 w-16">법적 근거</span>
                          <span className="text-gray-700 font-medium">
                            {RISK_LEGAL_BASIS[risk.risk_id]}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0 w-16">심각도</span>
                        <span className="text-gray-700 font-medium">
                          {risk.severity}/10
                          {risk.severity >= 9 && " (치명적)"}
                          {risk.severity >= 7 && risk.severity < 9 && " (높음)"}
                          {risk.severity >= 5 && risk.severity < 7 && " (중간)"}
                          {risk.severity < 5 && " (낮음)"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-400 shrink-0 w-16">항목 ID</span>
                        <span className="text-gray-700 font-medium">
                          {risk.risk_id} ({CATEGORY_LABELS[risk.category] || risk.category})
                        </span>
                      </div>
                      {risk.standard_risk_code && (
                        <div className="flex gap-2">
                          <span className="text-gray-400 shrink-0 w-16">글로벌</span>
                          <span className="text-indigo-600 font-medium">
                            {risk.standard_risk_code}
                            {SSRI_LABELS[risk.standard_risk_code] && (
                              <span className="text-indigo-400 font-normal ml-1">
                                ({SSRI_LABELS[risk.standard_risk_code]})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-blue-600 font-semibold mb-1">
                        수정 특약 제안
                      </p>
                      <p className="text-sm text-blue-900">
                        {risk.suggestion}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(risk.suggestion, risk.risk_id)
                      }
                      className="no-print shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                    >
                      {copiedId === risk.risk_id ? "복사됨!" : "복사"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 더 보기 / 접기 버튼 */}
          {result.detected_risks.length > 3 && (
            <button
              onClick={() => setShowAllRisks(!showAllRisks)}
              className="no-print w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 transition mb-4"
            >
              {showAllRisks
                ? "접기"
                : `나머지 ${result.detected_risks.length - 3}건 더 보기`}
            </button>
          )}
        </div>
      )}

      {/* ── [3] 추출된 계약 정보 ── */}
      {result.extracted && <ExtractedInfoSection extracted={result.extracted} />}

      {/* ── [4] 행동 유도 (Next Action) ── */}
      <div className="no-print bg-blue-50 rounded-xl border border-blue-100 p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-3">
          다음에 할 일
        </h3>
        <div className="space-y-2">
          {result.detected_risks.length > 0 && (
            <button
              onClick={() => {
                const allSuggestions = result.detected_risks
                  .map(
                    (r) =>
                      `[${r.risk_name}]\n${r.suggestion}`
                  )
                  .join("\n\n");
                handleCopy(allSuggestions, "all-suggestions");
              }}
              className="w-full flex items-center gap-3 bg-white rounded-lg p-3 text-left hover:bg-blue-50 transition border border-blue-100"
            >
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {copiedId === "all-suggestions"
                    ? "모든 특약 복사됨!"
                    : "수정 특약 전체 복사"}
                </p>
                <p className="text-xs text-gray-500">
                  중개사에게 보여주며 협상하세요
                </p>
              </div>
            </button>
          )}
          <div className="w-full flex items-center gap-3 bg-white rounded-lg p-3 border border-blue-100">
            <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                법률 전문가 상담 받기
              </p>
              <p className="text-xs text-gray-500">
                대한법률구조공단 132 / 주택임대차분쟁조정위원회 1533-8119
              </p>
            </div>
          </div>

          {/* PDF 저장 + 공유 버튼 */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-blue-100 hover:bg-blue-50 transition"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">PDF 저장</span>
            </button>
            {canShare && (
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 bg-white rounded-lg p-3 border border-blue-100 hover:bg-blue-50 transition"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">공유하기</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── [5] CTA + 면책 ── */}
      <button
        onClick={() => router.push("/upload")}
        className="no-print w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition mb-4"
      >
        다른 계약서 분석하기
      </button>

      <div className="bg-gray-100 rounded-lg p-4 print-border">
        <p className="text-xs text-gray-500 leading-relaxed">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
