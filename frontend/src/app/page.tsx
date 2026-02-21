import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">세이프홈 AI</h1>
      <p className="text-gray-500 mb-8">
        계약서를 읽지 못해도 위험을 알 수 있습니다
      </p>
      <Link
        href="/upload"
        className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition"
      >
        계약서 분석 시작하기
      </Link>
    </div>
  );
}
