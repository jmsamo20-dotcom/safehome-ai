"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisResult } from "@/lib/types";

const GRADE_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  A: { bg: "bg-green-100", text: "text-green-700", label: "안전" },
  B: { bg: "bg-green-50", text: "text-green-600", label: "양호" },
  C: { bg: "bg-yellow-50", text: "text-yellow-700", label: "보통" },
  D: { bg: "bg-orange-50", text: "text-orange-700", label: "주의" },
  E: { bg: "bg-red-50", text: "text-red-600", label: "위험" },
  F: { bg: "bg-red-100", text: "text-red-700", label: "매우 위험" },
};

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage에서 결과 또는 에러 로드
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
      // 직접 접근 시 업로드 페이지로
      router.push("/upload");
    }
  }, [router]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  return (
    <div className="pb-8">
      {/* 위험도 등급 */}
      <div className={`${gradeStyle.bg} rounded-2xl p-6 text-center mb-6`}>
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

      {/* 쉬운 말 요약 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">요약</h3>
        <p className="text-gray-700 text-sm leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* 위험 조항 리스트 */}
      {result.detected_risks.length > 0 && (
        <>
          <h3 className="font-semibold text-gray-900 mb-3">
            탐지된 위험 요소 ({result.detected_risks.length}건)
          </h3>
          <div className="space-y-4 mb-6">
            {result.detected_risks.map((risk) => (
              <div
                key={risk.risk_id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
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
                      className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                    >
                      {copiedId === risk.risk_id ? "복사됨!" : "복사"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 다시 분석하기 */}
      <button
        onClick={() => router.push("/upload")}
        className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition mb-4"
      >
        다른 계약서 분석하기
      </button>

      {/* 면책 고지 */}
      <div className="bg-gray-100 rounded-lg p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
