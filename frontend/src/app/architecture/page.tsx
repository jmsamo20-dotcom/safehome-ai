"use client";

import { useState } from "react";
import Link from "next/link";

/* ──────────────────────────────────────────────
   SSRI Mapping Data
   ────────────────────────────────────────────── */
const SSRI_MAP: {
  kr: string;
  ssri: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
}[] = [
  { kr: "A-1", ssri: "SSRI-001", label: "Owner Mismatch", severity: "critical" },
  { kr: "A-2", ssri: "SSRI-002", label: "Subletting Risk", severity: "high" },
  { kr: "A-3", ssri: "SSRI-003", label: "Excessive Secured Debt", severity: "critical" },
  { kr: "A-4", ssri: "SSRI-004", label: "Deposit Discrepancy", severity: "high" },
  { kr: "B-1", ssri: "SSRI-005", label: "Coerced Rights Waiver", severity: "critical" },
  { kr: "B-2", ssri: "SSRI-006", label: "Forced Eviction Clause", severity: "critical" },
  { kr: "B-3", ssri: "SSRI-011", label: "Tax Default Liability", severity: "high" },
  { kr: "B-4", ssri: "SSRI-014", label: "Maintenance Burden Shift", severity: "medium" },
  { kr: "B-5", ssri: "SSRI-010", label: "Short-term Lease", severity: "medium" },
  { kr: "B-6", ssri: "SSRI-007", label: "Seizure / Attachment", severity: "critical" },
  { kr: "C-1", ssri: "SSRI-007", label: "Seizure / Attachment", severity: "critical" },
  { kr: "C-2", ssri: "SSRI-008", label: "Trust Encumbrance", severity: "high" },
  { kr: "C-3", ssri: "SSRI-009", label: "Prior Tenant Claims", severity: "high" },
  { kr: "C-4", ssri: "SSRI-003", label: "Excessive Secured Debt", severity: "critical" },
  { kr: "C-5", ssri: "SSRI-003", label: "Excessive Secured Debt", severity: "critical" },
  { kr: "C-6", ssri: "SSRI-015", label: "Same-day Rights Change", severity: "high" },
  { kr: "D-1", ssri: "SSRI-999", label: "Country-specific Risk", severity: "medium" },
  { kr: "D-2", ssri: "SSRI-012", label: "Building Code Violation", severity: "medium" },
  { kr: "D-3", ssri: "SSRI-001", label: "Owner Mismatch", severity: "critical" },
  { kr: "D-4", ssri: "SSRI-999", label: "Country-specific Risk", severity: "low" },
  { kr: "D-5", ssri: "SSRI-011", label: "Tax Default Liability", severity: "high" },
];

const SEVERITY_STYLES = {
  critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  medium: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", dot: "bg-yellow-500" },
  low: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
};

/* ──────────────────────────────────────────────
   Pipeline Steps
   ────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    ),
    name: "업로드",
    eng: "Upload",
    desc: "PDF, JPG, PNG 문서 입력",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    ),
    name: "OCR 추출",
    eng: "OCR",
    desc: "텍스트 자동 인식 및 구조화",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
    name: "규칙 엔진",
    eng: "Rule Engine",
    desc: "25개 위험 패턴 키워드 매칭",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    ),
    name: "LLM 분석",
    eng: "LLM Analysis",
    desc: "GPT 기반 문맥 위험 판단",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
    name: "교차 검증",
    eng: "Cross Validation",
    desc: "다중 서류 간 정보 대조",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    name: "SSRI 매핑",
    eng: "SSRI Mapping",
    desc: "글로벌 표준 코드 변환",
  },
  {
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
    name: "위험 등급",
    eng: "Risk Grade",
    desc: "A~F 등급 + 보증금 시뮬레이션",
  },
];

/* ──────────────────────────────────────────────
   Page Component
   ────────────────────────────────────────────── */
export default function ArchitecturePage() {
  const [hoveredPlugin, setHoveredPlugin] = useState<string | null>(null);
  const [expandedMapping, setExpandedMapping] = useState(false);

  return (
    <div className="pb-10">
      {/* ── Back Button ── */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        홈으로
      </Link>

      {/* ── Hero ── */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">
          세이프홈 AI 아키텍처
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          글로벌 확장 가능한 모듈형 위험 분석 엔진
        </p>
      </div>

      {/* ══════════════════════════════════════════
          Section 1: Key Stats
          ══════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-2 mb-8">
        {[
          { value: "25", label: "위험 항목", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
          { value: "16", label: "SSRI 코드", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          { value: "7", label: "분석 단계", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { value: "3", label: "문서 유형", color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border ${stat.border} rounded-xl p-3 text-center transition hover:scale-105`}
          >
            <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          Section 2: Analysis Pipeline
          ══════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">분석 파이프라인</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          문서 업로드부터 위험 등급 산출까지 7단계 자동 분석
        </p>

        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-300 via-blue-400 to-indigo-500" />

          <div className="space-y-1">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.eng} className="relative flex items-start gap-3 group">
                {/* Node */}
                <div className="relative z-10 w-[48px] h-[48px] shrink-0 flex items-center justify-center">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${
                      i === 0
                        ? "bg-blue-600 shadow-md shadow-blue-200"
                        : i === PIPELINE_STEPS.length - 1
                        ? "bg-indigo-600 shadow-md shadow-indigo-200"
                        : "bg-white border-2 border-blue-200 group-hover:border-blue-400 group-hover:bg-blue-50"
                    }`}
                  >
                    <svg
                      className={`w-5 h-5 ${
                        i === 0 || i === PIPELINE_STEPS.length - 1
                          ? "text-white"
                          : "text-blue-500 group-hover:text-blue-600"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {step.icon}
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-4 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">{step.name}</h3>
                    <span className="text-xs text-gray-400 font-mono">{step.eng}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                </div>

                {/* Arrow indicator between steps */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="absolute left-[19px] bottom-[-2px] z-20">
                    <svg className="w-2.5 h-2.5 text-blue-400" fill="currentColor" viewBox="0 0 10 10">
                      <path d="M5 0 L10 5 L5 10 L5 7 L0 7 L0 3 L5 3 Z" transform="rotate(90 5 5)" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 3: Hybrid Detection
          ══════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">하이브리드 탐지</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          규칙 기반 + LLM 기반을 결합한 이중 분석 구조
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Two engines side by side */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {/* Rule Engine */}
            <div className="p-4 hover:bg-blue-50/50 transition">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">규칙 엔진</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                키워드 패턴 매칭 기반 확정적 탐지
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-xs text-gray-600">빠른 속도</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-xs text-gray-600">확실한 탐지</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  <span className="text-xs text-gray-600">비용 없음</span>
                </div>
              </div>
            </div>

            {/* LLM Engine */}
            <div className="p-4 hover:bg-purple-50/50 transition">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">LLM 분석</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                GPT 기반 문맥 이해 및 추론 분석
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <span className="text-xs text-gray-600">문맥 이해</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <span className="text-xs text-gray-600">우회 표현 탐지</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                  <span className="text-xs text-gray-600">설명 생성</span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Result */}
          <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span className="text-xs font-semibold text-gray-700">규칙</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                <span className="text-xs font-semibold text-gray-700">LLM</span>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-sm" />
                <span className="text-xs font-bold text-indigo-700">Hybrid</span>
              </div>
            </div>
            <p className="text-center text-xs text-indigo-600 font-semibold mt-2">
              속도와 정확도를 모두 확보한 최적의 분석
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 4: Plugin Architecture
          ══════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">플러그인 아키텍처</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          국가별 플러그인으로 글로벌 확장 가능한 모듈 구조
        </p>

        {/* Core Framework */}
        <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 mb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">core/ 프레임워크</h3>
              <p className="text-gray-400 text-xs">
                분석 엔진 / SSRI 표준 / 파이프라인
              </p>
            </div>
          </div>

          {/* Core modules */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { name: "Pipeline", desc: "분석 흐름" },
              { name: "SSRI", desc: "글로벌 표준" },
              { name: "Grading", desc: "등급 산출" },
            ].map((mod) => (
              <div
                key={mod.name}
                className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center hover:bg-white/10 transition"
              >
                <p className="text-white text-xs font-bold font-mono">{mod.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{mod.desc}</p>
              </div>
            ))}
          </div>

          {/* Connection arrows */}
          <div className="flex justify-center my-3">
            <div className="flex items-center gap-1 text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xs font-mono">Plugin Interface</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Plugin Slots */}
        <div className="grid grid-cols-3 gap-2">
          {/* KR Plugin - Active */}
          <div
            className={`relative rounded-xl border-2 p-3 text-center transition-all duration-300 cursor-pointer ${
              hoveredPlugin === "kr"
                ? "bg-blue-50 border-blue-400 shadow-lg shadow-blue-100 scale-105"
                : "bg-white border-blue-200 hover:border-blue-300"
            }`}
            onMouseEnter={() => setHoveredPlugin("kr")}
            onMouseLeave={() => setHoveredPlugin(null)}
            onTouchStart={() => setHoveredPlugin(hoveredPlugin === "kr" ? null : "kr")}
          >
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl mb-1">&#127472;&#127479;</div>
            <p className="text-sm font-bold text-gray-900">plugins/kr/</p>
            <p className="text-xs text-blue-600 font-semibold mt-1">활성</p>
            {hoveredPlugin === "kr" && (
              <div className="mt-2 pt-2 border-t border-blue-100 text-left">
                <p className="text-xs text-gray-600 leading-relaxed">
                  25개 위험 항목
                  <br />
                  한국 임대차보호법
                  <br />
                  등기부등본 분석
                </p>
              </div>
            )}
          </div>

          {/* JP Plugin - Coming Soon */}
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 text-center opacity-50 hover:opacity-70 transition">
            <div className="text-2xl mb-1">&#127471;&#127477;</div>
            <p className="text-sm font-bold text-gray-400">plugins/jp/</p>
            <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
          </div>

          {/* US Plugin - Coming Soon */}
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-3 text-center opacity-50 hover:opacity-70 transition">
            <div className="text-2xl mb-1">&#127482;&#127480;</div>
            <p className="text-sm font-bold text-gray-400">plugins/us/</p>
            <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
          </div>
        </div>

        {/* Architecture benefit */}
        <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <p className="text-xs text-indigo-700 leading-relaxed text-center">
            <span className="font-bold">core/</span>는 국가에 독립적 &rarr; 새 플러그인만 추가하면 즉시 해당 국가 서비스 가능
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 5: SSRI Mapping Table
          ══════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">SSRI 표준 매핑</h2>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          한국 위험 코드를 SSRI 글로벌 표준으로 자동 변환
        </p>

        {/* Severity legend */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(["critical", "high", "medium", "low"] as const).map((sev) => (
            <div key={sev} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${SEVERITY_STYLES[sev].dot}`} />
              <span className="text-xs text-gray-500">
                {sev === "critical"
                  ? "치명"
                  : sev === "high"
                  ? "높음"
                  : sev === "medium"
                  ? "중간"
                  : "낮음"}
              </span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 px-3 py-2.5">
            <div className="col-span-2">
              <span className="text-xs font-bold text-gray-500">KR</span>
            </div>
            <div className="col-span-3">
              <span className="text-xs font-bold text-indigo-500">SSRI</span>
            </div>
            <div className="col-span-5">
              <span className="text-xs font-bold text-gray-500">Label</span>
            </div>
            <div className="col-span-2 text-right">
              <span className="text-xs font-bold text-gray-500">심각도</span>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {(expandedMapping ? SSRI_MAP : SSRI_MAP.slice(0, 8)).map((row, i) => {
              const sty = SEVERITY_STYLES[row.severity];
              return (
                <div
                  key={`${row.kr}-${i}`}
                  className="grid grid-cols-12 gap-0 px-3 py-2 items-center hover:bg-gray-50 transition"
                >
                  <div className="col-span-2">
                    <span className="text-xs font-mono font-bold text-gray-700">
                      {row.kr}
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs font-mono font-semibold text-indigo-600">
                      {row.ssri}
                    </span>
                  </div>
                  <div className="col-span-5">
                    <span className="text-xs text-gray-600">{row.label}</span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${sty.bg} ${sty.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sty.dot}`} />
                      {row.severity === "critical"
                        ? "치명"
                        : row.severity === "high"
                        ? "높음"
                        : row.severity === "medium"
                        ? "중간"
                        : "낮음"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand toggle */}
          {SSRI_MAP.length > 8 && (
            <button
              onClick={() => setExpandedMapping(!expandedMapping)}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-indigo-600 border-t border-gray-100 transition flex items-center justify-center gap-1"
            >
              {expandedMapping ? "접기" : `나머지 ${SSRI_MAP.length - 8}개 더 보기`}
              <svg
                className={`w-3.5 h-3.5 transition-transform ${expandedMapping ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* SSRI explanation */}
        <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-indigo-700 leading-relaxed">
              <span className="font-bold">SSRI</span> (SafeHome Standard Risk Index)는
              국가별 위험 코드를 글로벌 표준으로 변환하는 자체 인덱스입니다.
              각국 플러그인의 위험 항목이 동일한 SSRI 코드로 매핑되어 국가 간 비교 분석이 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 6: Tech Stack
          ══════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">기술 스택</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Frontend",
              tech: "Next.js 15",
              detail: "App Router, Tailwind",
              color: "bg-gray-900",
              textColor: "text-white",
            },
            {
              label: "Backend",
              tech: "FastAPI",
              detail: "Python, Docker",
              color: "bg-green-600",
              textColor: "text-white",
            },
            {
              label: "AI / LLM",
              tech: "GPT-4o mini",
              detail: "프롬프트 엔지니어링",
              color: "bg-purple-600",
              textColor: "text-white",
            },
            {
              label: "OCR",
              tech: "Upstage",
              detail: "Document AI",
              color: "bg-blue-600",
              textColor: "text-white",
            },
            {
              label: "Deploy",
              tech: "Vercel + Render",
              detail: "CI/CD 자동 배포",
              color: "bg-orange-500",
              textColor: "text-white",
            },
            {
              label: "Standard",
              tech: "SSRI v1.0",
              detail: "글로벌 위험 인덱스",
              color: "bg-indigo-600",
              textColor: "text-white",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${item.color} ${item.textColor}`}
                >
                  {item.label}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{item.tech}</p>
              <p className="text-xs text-gray-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Footer
          ══════════════════════════════════════════ */}
      <div className="text-center">
        <Link
          href="/upload"
          className="inline-block w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
        >
          직접 분석 체험하기
        </Link>
        <p className="text-gray-300 text-xs mt-4">
          SafeHome AI &middot; Architecture v1.0
        </p>
      </div>
    </div>
  );
}
