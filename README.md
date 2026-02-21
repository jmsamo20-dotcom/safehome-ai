# SafeHome AI (세이프홈 AI)

> AI 기반 전월세 계약 위험 분석 서비스 — 3분 만에 전세사기 위험 신호를 탐지합니다.

**Live Demo**: [safehome-ai.vercel.app](https://safehome-ai.vercel.app)

---

## Problem

- 전세사기 피해자 **36,449명** (2026.02 누적), 75%가 20~30대
- 1인당 평균 피해액 **1.8억원**
- 계약서/등기부등본을 읽을 수 있는 일반인은 거의 없음

## Solution

계약서 사진 한 장으로 **25개 위험 항목**을 AI가 자동 분석합니다.

```
계약서 업로드 → OCR 텍스트 추출 → Rule 기반 탐지 + LLM 문맥 분석 → 교차 검증 → 위험 등급 + 수정 특약 제안
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **3종 문서 분석** | 계약서 + 등기부등본 + 건축물대장 동시 업로드 |
| **하이브리드 탐지** | Rule 기반 키워드 매칭 (확실) + Claude LLM 문맥 분석 (맥락 이해) |
| **교차 검증** | 임대인=소유자 확인, 깡통전세 비율 계산, 가압류/신탁 탐지 |
| **위험 등급 (A~F)** | 100점 만점 안전 점수 + 6단계 등급 |
| **보증금 회수 시뮬레이션** | 경매 시 보증금 회수 가능성 % 산출 |
| **수정 특약 제안** | 위험 항목별 방어 특약 문구 자동 생성 + 복사 기능 |
| **PDF 내보내기 / 공유** | 분석 결과를 PDF로 저장하거나 카카오톡 등으로 공유 |
| **글로벌 표준 코드 (SSRI)** | 국가별 위험 코드를 범용 코드로 매핑 (글로벌 확장 설계) |

---

## Architecture

### 모듈형 플러그인 아키텍처 (Strategy Pattern)

국가별 법령에 종속되지 않는 **플러그인 기반 설계**로, 한국 외 국가 확장이 가능합니다.

```
backend/
├── core/                          # Framework Layer (국가 무관)
│   ├── interfaces.py              # ABC 5개: IRuleEngine, ILLMAnalyzer, IOCRService, ICrossValidator, ICountryPlugin
│   ├── standard_schema.py         # SSRI 표준 위험 코드 (16개)
│   ├── registry.py                # 플러그인 자동 스캔/등록
│   └── pipeline.py                # 6단계 분석 파이프라인 오케스트레이터
│
├── plugins/                       # Country Plugins
│   └── kr/                        # 한국 (레퍼런스 구현)
│       ├── __init__.py            # KoreaPlugin + KR→SSRI 매핑 (21개)
│       ├── rule_engine.py         # 키워드 탐지 + 등급 산출
│       ├── llm_analyzer.py        # Claude API 계약서 분석
│       ├── ocr_service.py         # Tesseract OCR (kor+eng)
│       ├── cross_validator.py     # 다중 문서 교차 검증
│       ├── risk_definitions.py    # 25개 위험 항목 정의
│       └── params.json            # 최우선변제금, 전세가율 등
│
├── models/schemas.py              # Pydantic 데이터 모델
├── routers/                       # FastAPI 엔드포인트
└── services/                      # 하위 호환 shim (re-export)

frontend/
├── src/app/                       # Next.js App Router
│   ├── page.tsx                   # 랜딩 페이지
│   ├── upload/page.tsx            # 파일 업로드 + 분석 진행
│   └── result/page.tsx            # 분석 결과 (등급, 위험, 교차검증, 시뮬레이션)
└── src/lib/                       # API 연동, 타입, 샘플 데이터
```

### 분석 파이프라인 (6단계)

```
Step 1: 파일 업로드 + 검증
Step 2: OCR 텍스트 추출 (Tesseract / pdftotext)
Step 3: Rule 기반 키워드 탐지 (10개 카테고리, 즉시 탐지)
Step 4: LLM 문맥 분석 (Claude API, 구조화 JSON 출력)
Step 5: 교차 검증 (임대인=소유자, 깡통전세 비율, 가압류/신탁)
Step 6: 등급 산출 + SSRI 매핑 + 결과 반환
```

### 위험 등급 시스템

| Grade | Label | Trigger |
|-------|-------|---------|
| **F** | 매우 위험 | 압류, 깡통전세, 우선변제권 포기, 갭투자 등 (즉시 계약 중단) |
| **E** | 위험 | 선순위 전세권, 임차권등기 이력 |
| **D** | 주의 | 보증보험 거부, 체납 전가, 전대차 |
| **C** | 보통 | 일반 감점제 (점수 65~84) |
| **B** | 양호 | 일반 감점제 (점수 85~100) |
| **A** | 안전 | 위험 요소 0건 (점수 95) |

### SSRI (Standard SafeHome Risk Index)

국가별 위험 코드를 **16개 범용 코드**로 매핑하여 글로벌 비교 가능:

| SSRI Code | Global Meaning | Korea Mapping |
|-----------|---------------|---------------|
| SSRI-001 | Owner Mismatch | A-1, D-3 |
| SSRI-003 | Excessive Secured Debt | C-4, D-1 |
| SSRI-005 | Coerced Rights Waiver | B-1, B-2 |
| SSRI-006 | Forced Eviction Clause | B-6 |
| SSRI-007 | Seizure / Attachment | C-1 |
| SSRI-015 | Same-day Rights Change | C-6 |
| ... | (16 codes total) | (21 mappings) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 + React 18 + TypeScript + Tailwind CSS |
| **Backend** | FastAPI + Python 3.11 |
| **AI/LLM** | Anthropic Claude API (claude-sonnet-4) |
| **OCR** | Tesseract OCR (kor+eng) + poppler-utils (PDF) |
| **Hosting** | Vercel (frontend) + Render (backend, Docker) |
| **Architecture** | Strategy Pattern Plugin System |

---

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=your-key" > .env
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | 서비스 상태 + 로드된 플러그인 목록 |
| `POST` | `/api/analyze` | 계약서 분석 (multipart/form-data) |

### POST /api/analyze

```
contract_image: File (required)  - 계약서 이미지/PDF
registry_image: File (optional)  - 등기부등본
building_image: File (optional)  - 건축물대장
```

Response: `AnalysisResult` (grade, score, detected_risks[], cross_checks[], extracted, simulation)

---

## Development Timeline

| Day | Milestone |
|-----|-----------|
| 1 | Initial project setup |
| 2 | Risk engine + frontend screens |
| 3 | Full analysis pipeline + AI feedback |
| 4 | Render deployment optimization |
| 5 | Sample demo + home screen |
| 6 | Extracted info + category bars + CTA |
| 7 | F-grade fraud sample + dual sample UI |
| 8 | PDF export + share functionality |
| 9 | Deposit recovery simulation + A-grade sample + landing redesign |
| 10 | AI transparency + recommended actions + card collapsing |
| 11 | Multi-document upload + cross-validation + cross-check UI |
| 12 | **Modular plugin architecture refactoring (Strategy Pattern)** |
| 12 | **SSRI global standard risk codes (frontend + backend)** |

---

## License

This project was built for the SW Competition. All rights reserved.
