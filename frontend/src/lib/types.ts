export interface DetectedRisk {
  risk_id: string;
  risk_name: string;
  category: string;
  severity: number;
  matched_text: string;
  explanation: string;
  suggestion: string;
}

export interface AnalysisResult {
  grade: "A" | "B" | "C" | "D" | "E" | "F";
  score: number;
  detected_risks: DetectedRisk[];
  summary: string;
  disclaimer: string;
}
