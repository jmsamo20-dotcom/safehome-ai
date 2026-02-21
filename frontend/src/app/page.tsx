import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-[80vh] pt-10 pb-8">
      {/* 히어로 */}
      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-5">
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

      <h1 className="text-2xl font-black text-gray-900 text-center leading-tight mb-3">
        계약서를 읽지 않아도,
        <br />
        당신의 보증금은 지켜야 합니다.
      </h1>
      <p className="text-gray-500 text-center text-sm leading-relaxed mb-8 max-w-xs">
        세이프홈 AI는 전월세 계약서와 등기부를 분석해
        <br />
        전세사기 위험 신호를 알려줍니다.
      </p>

      {/* CTA */}
      <Link
        href="/upload"
        className="w-full max-w-xs bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition text-center mb-3"
      >
        계약서 분석 시작하기
      </Link>
      <p className="text-gray-400 text-xs mb-10">
        무료 / 사진 한 장이면 3분 완료
      </p>

      {/* 3단계 */}
      <div className="w-full max-w-sm space-y-3">
        {[
          {
            step: "1",
            title: "계약서 업로드",
            desc: "사진 또는 PDF를 올리면 AI가 자동으로 읽습니다",
            color: "bg-blue-600",
          },
          {
            step: "2",
            title: "위험 신호 분석",
            desc: "가압류, 깡통전세, 독소 조항 등 25개 항목 자동 검사",
            color: "bg-orange-500",
          },
          {
            step: "3",
            title: "보증금 안전도 + 수정 특약",
            desc: "회수 가능성을 %로 보여주고, 수정 문구까지 제안",
            color: "bg-green-600",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-4"
          >
            <div
              className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center shrink-0`}
            >
              <span className="text-white text-sm font-bold">{item.step}</span>
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

      {/* 통계 (Gemini 제공) */}
      <div className="w-full max-w-sm mt-8 bg-gray-900 rounded-xl p-5 text-center">
        <p className="text-gray-400 text-xs mb-3">왜 필요한가요?</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xl font-black text-white">1.8억</p>
            <p className="text-xs text-gray-400">건당 평균 피해</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">72%</p>
            <p className="text-xs text-gray-400">2030 불안 비율</p>
          </div>
          <div>
            <p className="text-xl font-black text-white">3분</p>
            <p className="text-xs text-gray-400">분석 소요 시간</p>
          </div>
        </div>
      </div>

      {/* 면책 */}
      <p className="text-gray-300 text-xs text-center mt-8 max-w-xs leading-relaxed">
        본 서비스는 AI 기반 참고 정보를 제공하며, 법률 자문이 아닙니다.
      </p>
    </div>
  );
}
