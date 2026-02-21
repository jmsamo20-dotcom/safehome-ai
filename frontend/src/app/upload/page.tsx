"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("PDF, JPG, PNG 파일만 지원합니다.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("파일 크기는 10MB 이하만 가능합니다.");
        return;
      }

      // sessionStorage에 파일 정보 임시 저장 (실제로는 FormData로 전송)
      sessionStorage.setItem(
        "safehome_file",
        JSON.stringify({ name: file.name, size: file.size, type: file.type })
      );

      // TODO: 실제 구현 시 파일을 API로 전송
      router.push("/analyzing");
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col items-center min-h-[80vh]">
      <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-1">
        계약서 업로드
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        계약서 또는 등기부등본 사진을 올려주세요
      </p>

      {/* Drop Zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`w-full max-w-sm aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 16v-8m0 0l-3 3m3-3l3 3M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-4"
          />
        </svg>
        <span className="text-gray-600 font-medium mb-1">
          터치하여 파일 선택
        </span>
        <span className="text-gray-400 text-xs">PDF, JPG, PNG (10MB 이하)</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
        />
      </label>

      {error && (
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
