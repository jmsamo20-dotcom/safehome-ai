"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { analyzeContract } from "@/lib/api";
import { SAMPLE_SAFE, SAMPLE_CAUTION, SAMPLE_FRAUD } from "@/lib/sample-data";

const ANALYZE_STEPS = [
  "문서 읽는 중...",
  "핵심 정보 추출 중...",
  "교차 검증 중...",
  "위험 요소 분석 중...",
  "결과 생성 중...",
];

interface FileSlot {
  label: string;
  sublabel: string;
  required: boolean;
  badge?: string;
}

const FILE_SLOTS: FileSlot[] = [
  { label: "임대차 계약서", sublabel: "필수", required: true },
  { label: "등기부등본", sublabel: "강력 추천", required: false, badge: "정확도 UP" },
  { label: "건축물대장", sublabel: "선택", required: false },
];

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 10 * 1024 * 1024;

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setCurrentStep((prev) =>
        prev < ANALYZE_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const handleFileSelect = (index: number, file: File | null) => {
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("PDF, JPG, PNG 파일만 지원합니다.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("파일 크기는 10MB 이하만 가능합니다.");
      return;
    }

    setFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    if (inputRefs.current[index]) {
      inputRefs.current[index]!.value = "";
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!files[0]) {
      setError("계약서를 업로드해 주세요.");
      return;
    }

    setIsAnalyzing(true);
    setCurrentStep(0);

    const startTime = Date.now();
    try {
      const result = await analyzeContract(files[0], files[1], files[2]);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      sessionStorage.setItem("safehome_elapsed", elapsed);
      sessionStorage.setItem("safehome_result", JSON.stringify(result));
      router.push("/result");
    } catch (err) {
      sessionStorage.setItem(
        "safehome_error",
        err instanceof Error ? err.message : "분석 중 오류가 발생했습니다."
      );
      router.push("/result");
    }
  }, [files, router]);

  const handleSampleDemo = (type: "safe" | "caution" | "fraud") => {
    const samples = { safe: SAMPLE_SAFE, caution: SAMPLE_CAUTION, fraud: SAMPLE_FRAUD };
    sessionStorage.setItem("safehome_result", JSON.stringify(samples[type]));
    router.push("/result");
  };

  // ── 분석 중 화면 ──
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-8" />
        <h2 className="text-xl font-bold text-gray-900 mb-6">AI 분석 중</h2>
        <div className="w-full max-w-xs space-y-3">
          {ANALYZE_STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < currentStep
                    ? "bg-blue-600 text-white"
                    : i === currentStep
                    ? "bg-blue-100 text-blue-600 animate-pulse"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < currentStep ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i <= currentStep ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-8">
          서류가 많을수록 분석이 정확합니다
        </p>
      </div>
    );
  }

  const fileCount = files.filter(Boolean).length;

  // ── 업로드 화면 ──
  return (
    <div className="flex flex-col items-center min-h-[80vh]">
      <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-1">
        서류 업로드
      </h1>
      <p className="text-gray-500 text-sm mb-2 text-center">
        계약서와 등기부를 함께 올리면
        <br />
        <span className="text-blue-600 font-semibold">교차 검증으로 정확도가 올라갑니다</span>
      </p>

      {/* 정확도 인디케이터 */}
      <div className="flex items-center gap-1 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`w-8 h-1.5 rounded-full transition-all ${
              fileCount >= n ? "bg-blue-600" : "bg-gray-200"
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-2">
          {fileCount === 0
            ? ""
            : fileCount === 1
            ? "기본 분석"
            : fileCount === 2
            ? "교차 검증"
            : "완전 분석"}
        </span>
      </div>

      {/* 파일 슬롯 */}
      <div className="w-full max-w-sm space-y-3">
        {FILE_SLOTS.map((slot, i) => (
          <div key={slot.label}>
            {files[i] ? (
              /* 파일 선택됨 */
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {files[i]!.name}
                  </p>
                  <p className="text-xs text-gray-500">{slot.label}</p>
                </div>
                <button
                  onClick={() => handleRemoveFile(i)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              /* 빈 슬롯 */
              <label
                className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition border ${
                  slot.required
                    ? "bg-white border-gray-300 hover:border-blue-400"
                    : "bg-gray-50 border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  slot.required ? "bg-blue-100" : "bg-gray-100"
                }`}>
                  <svg className={`w-5 h-5 ${slot.required ? "text-blue-500" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{slot.label}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      slot.required
                        ? "bg-blue-100 text-blue-700"
                        : slot.badge
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {slot.badge || slot.sublabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG</p>
                </div>
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileSelect(i, e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg w-full max-w-sm">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 분석 시작 버튼 */}
      <button
        onClick={handleAnalyze}
        disabled={!files[0]}
        className={`w-full max-w-sm mt-6 py-4 rounded-xl text-lg font-semibold transition ${
          files[0]
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        {fileCount <= 1 ? "분석 시작하기" : `${fileCount}개 서류 교차 분석하기`}
      </button>

      {/* 샘플 체험 */}
      <div className="mt-8 w-full max-w-sm">
        <div className="relative flex items-center mb-4">
          <div className="flex-grow border-t border-gray-200" />
          <span className="mx-3 text-gray-400 text-xs">또는 샘플로 체험하기</span>
          <div className="flex-grow border-t border-gray-200" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleSampleDemo("safe")}
            className="py-3 px-2 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition text-center"
          >
            <span className="block text-xl font-black text-green-700 mb-0.5">A</span>
            <span className="block text-xs font-medium text-green-800">안전</span>
          </button>
          <button
            onClick={() => handleSampleDemo("caution")}
            className="py-3 px-2 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition text-center"
          >
            <span className="block text-xl font-black text-amber-700 mb-0.5">D</span>
            <span className="block text-xs font-medium text-amber-800">주의</span>
          </button>
          <button
            onClick={() => handleSampleDemo("fraud")}
            className="py-3 px-2 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition text-center"
          >
            <span className="block text-xl font-black text-red-700 mb-0.5">F</span>
            <span className="block text-xs font-medium text-red-800">전세사기</span>
          </button>
        </div>
        <p className="text-center text-gray-400 text-xs mt-3">
          실제 사례 기반 샘플 분석 결과를 확인합니다
        </p>
      </div>
    </div>
  );
}
