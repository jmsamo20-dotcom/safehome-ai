import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-[80vh] pt-12 pb-8">
      {/* 히어로 */}
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-blue-600"
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
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-2">세이프홈 AI</h1>
      <p className="text-gray-500 text-center mb-10 leading-relaxed">
        전월세 계약서 사진 한 장이면
        <br />
        <span className="text-gray-800 font-semibold">
          위험 요소를 AI가 즉시 분석
        </span>
        합니다
      </p>

      {/* CTA */}
      <Link
        href="/upload"
        className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition text-center mb-4"
      >
        계약서 분석 시작하기
      </Link>

      {/* 주요 기능 */}
      <div className="w-full max-w-sm mt-10 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          주요 기능
        </h2>
        {[
          {
            icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
            title: "계약서 OCR 분석",
            desc: "사진/PDF를 텍스트로 변환하여 분석",
          },
          {
            icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
            title: "위험 요소 자동 탐지",
            desc: "압류, 독소 조항, 깡통전세 등 25개 항목 검사",
          },
          {
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            title: "A~F 등급 및 수정 제안",
            desc: "위험도 점수와 수정 특약 문구를 제공",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d={item.icon}
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {item.title}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 면책 */}
      <p className="text-gray-300 text-xs text-center mt-10 max-w-xs leading-relaxed">
        본 서비스는 AI 기반 참고 정보를 제공하며, 법률 자문이 아닙니다.
      </p>
    </div>
  );
}
