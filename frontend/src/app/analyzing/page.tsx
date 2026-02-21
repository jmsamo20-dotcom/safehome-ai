"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  "문서 읽는 중...",
  "핵심 정보 추출 중...",
  "위험 요소 분석 중...",
  "결과 생성 중...",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 단계별 애니메이션
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);

    // 안전장치: API 타임아웃(3분) 후에도 결과가 없으면 업로드로 복귀
    const safety = setTimeout(() => router.push("/upload"), 180000);

    return () => {
      clearInterval(interval);
      clearTimeout(safety);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      {/* Spinner */}
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-8" />

      <h2 className="text-xl font-bold text-gray-900 mb-6">AI 분석 중</h2>

      <div className="w-full max-w-xs space-y-3">
        {STEPS.map((step, i) => (
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
              {i < currentStep ? "✓" : i + 1}
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
        보통 10~30초 정도 소요됩니다
      </p>
    </div>
  );
}
