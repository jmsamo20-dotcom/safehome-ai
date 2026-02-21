"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult, ExtractedInfo } from "@/lib/types";

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

const CATEGORY_LABELS: Record<string, string> = {
  contract: "계약 조항",
  special: "특약 사항",
  registry: "등기부",
  situation: "상황 정보",
};

function InfoValue({ value }: { value?: string }) {
  const isUnknown = !value || value === "확인 불가";
  return (
    <span className={isUnknown ? "text-gray-400" : "text-gray-900 font-medium"}>
      {isUnknown ? "확인 불가" : value}
    </span>
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

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    const storedResult = sessionStorage.getItem("safehome_result");
    const storedError = sessionStorage.getItem("safehome_error");

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

      {/* ── [1] HERO: 등급 + 점수 + 요약 ── */}
      <div className={`${gradeStyle.bg} rounded-2xl p-6 text-center mb-4`}>
        <p className="text-sm text-gray-500 mb-1">위험도 등급</p>
        <div className={`text-6xl font-black ${gradeStyle.text} mb-1`}>
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

      {/* 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.summary}
        </p>
      </div>

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
          <h3 className="font-semibold text-gray-900 mb-3">
            탐지된 위험 요소 ({result.detected_risks.length}건)
          </h3>
          <div className="space-y-4 mb-6">
            {result.detected_risks.map((risk) => (
              <div
                key={risk.risk_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden print-keep print-border"
              >
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
