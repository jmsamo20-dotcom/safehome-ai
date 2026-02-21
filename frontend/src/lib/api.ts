import { API_BASE_URL } from "./constants";

const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000; // 3분

export async function analyzeContract(file: File) {
  const formData = new FormData();
  formData.append("contract_image", file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "알 수 없는 오류" }));
      throw new Error(error.detail || `서버 오류 (${response.status})`);
    }

    return response.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("분석 시간이 초과되었습니다. 다시 시도해 주세요.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth(): Promise<{
  status: string;
  service: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  return response.json();
}
