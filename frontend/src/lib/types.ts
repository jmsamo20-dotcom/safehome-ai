export interface DetectedRisk {
  risk_id: string;
  risk_name: string;
  category: string;
  severity: number;
  matched_text: string;
  explanation: string;
  suggestion: string;
}

export interface ExtractedInfo {
  landlord?: { name?: string; id_hint?: string; address?: string };
  tenant?: { name?: string; id_hint?: string; address?: string };
  property?: { address?: string; unit?: string };
  money?: {
    deposit?: string;
    rent?: string;
    maintenance_fee?: string;
    payment_day?: string;
  };
  term?: { start_date?: string; end_date?: string };
  registry?: { owner?: string; rights_summary?: string };
}

export interface DepositSimulation {
  deposit_amount: string;
  recovery_rate: number;
  risk_factors: string[];
  safe_factors: string[];
}

export interface AnalysisResult {
  grade: "A" | "B" | "C" | "D" | "E" | "F";
  score: number;
  detected_risks: DetectedRisk[];
  summary: string;
  disclaimer: string;
  extracted?: ExtractedInfo;
  document_type?: string;
  simulation?: DepositSimulation;
}
