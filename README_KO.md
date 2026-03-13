<div align="center">

# ThinkLingo — 크로스 언어 추론

**입력을 지정된 처리 언어(기본: 영어)로 번역한 후 추론을 수행하여 추론 품질을 표준화하는 다국어 LLM 채팅 앱.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[English](README.md) | [中文](README_CN.md) | [日本語](README_JA.md) | **한국어**

</div>

> [!Important]
> ThinkLingo가 출시되었습니다! [thinklingo.yizesun.com](https://thinklingo.yizesun.com) 에서 바로 체험하세요. 설치가 필요 없습니다.

![ThinkLingo UI](assets/img01.png)

---

## 왜 ThinkLingo인가?

대규모 언어 모델(LLM)은 특정 언어——특히 영어——로 추론할 때 훨씬 더 좋은 결과를 냅니다. ThinkLingo는 입력을 자동으로 더 강력한 처리 언어(기본: 영어)로 번역한 후 LLM에게 추론하게 하고, 답변을 다시 여러분의 언어로 번역해 돌려줍니다. 어떤 언어를 사용하든 최고 수준의 추론 품질을 얻을 수 있습니다.

```
여러분의 메시지 (어떤 언어든)
  → [1] 처리 언어로 번역 (기본: 영어, 변경 가능)
  → [2] LLM이 처리 언어로 추론
  → [3] 답변을 여러분의 언어로 번역
  → 실시간 스트리밍으로 화면에 표시
```

2컬럼 UI로 양쪽을 동시에 보여줍니다——처리 언어의 추론 과정과 여러분의 모국어 번역——추론의 전 과정을 한눈에 파악할 수 있습니다.

**지원 언어:** English · 中文 · 日本語 · 한국어

---

## 기능

- **듀얼 LLM 아키텍처** — 추론과 번역에 각각 다른 모델 사용, 5개 제공업체 자유 조합 가능
- **실시간 스트리밍** — WebSocket 기반 토큰 단위 스트리밍, 단락 수준 병렬 번역 지원
- **스마트 프롬프트 라우팅** — 사용자 의도를 자동 분류하고 전문 시스템 프롬프트 적용 (코드 디버거, 수학 풀이, 창작 글쓰기 등)
- **사고 체인 표시** — 접을 수 있는 사고 과정 블록, 추론 모델 대응 (DeepSeek-R1, Qwen 사고 모델)
- **멀티 대화 관리** — 영속적 채팅 기록, LLM 자동 제목 생성, 도중 전환 가능
- **세션별 API 키** — UI에서 직접 키를 입력 가능, 서버 설정 불필요
- **보안 및 속도 제한** — 토큰 인증, 동적 세션, IP별 할당량, WebSocket 동시 접속 제한
- **반응형 디자인** — 데스크톱에서 2컬럼 레이아웃, 모바일에서 탭 전환

---

## 빠른 시작

### 옵션 A — Docker (권장)

**사전 요구 사항:** [Docker](https://docs.docker.com/get-docker/) 및 [Docker Compose](https://docs.docker.com/compose/install/).

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
docker-compose up -d
```

**http://localhost:3000** 을 엽니다 — 첫 방문 시 UI가 API 키 설정을 안내합니다.

**자주 사용하는 명령어**

```bash
docker-compose logs -f          # 로그 확인
docker-compose down             # 중지
docker-compose up -d --build    # 코드 변경 후 재빌드
```

---

### 옵션 B — 커맨드 라인

**사전 요구 사항:** Python 3.11 이상, Node.js 18 이상.

**1. 클론 및 설정**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

**2. 한 줄 명령으로 시작**

```bash
bash start.sh
```

`start.sh`는 모든 의존성을 설치하고 (첫 실행 시), 백엔드를 포트 8000, 프론트엔드를 포트 3000에서 시작합니다. `Ctrl+C`로 중지합니다.

<details>
<summary>수동 시작 (스크립트를 사용하지 않는 경우)</summary>

```bash
# 터미널 1 — 백엔드
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# 터미널 2 — 프론트엔드
cd frontend
npm install
npm start
```

</details>

**http://localhost:3000** 을 엽니다 — 완료입니다.

---

## 지원 LLM 제공업체

ThinkLingo는 **듀얼 LLM 설계**를 채택합니다 — 추론 모델과 번역 모델을 자유롭게 조합할 수 있습니다:

| 제공업체 | 추론 모델 | 번역 모델 | API 키 환경 변수 |
|---|---|---|---|
| DeepSeek | `deepseek-chat`, `deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | `gpt-3.5-turbo`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`, `claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`, `gemini-2.5-pro` | `gemini-2.5-flash`, `gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| Alibaba (Qwen) | `qwen-plus`, `qwen3-max`, `qwen3-max-thinking` | `qwen-turbo`, `qwen-plus` | `QWEN_API_KEY` |

`ALLOW_USER_API_KEYS=true`로 설정하면 사용자가 프론트엔드에서 세션별로 API 키를 직접 입력할 수 있습니다.

---

## 설정

모든 설정은 `.env` 파일에서 관리합니다 (`.env.template`에서 복사):

```bash
# ── API 키 (최소 1개 필요) ─────────────────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # ANTHROPIC_AUTH_TOKEN (OAuth 인증)도 지원
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── 제공업체 선택 ──────────────────────────────────────
# 지원: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # 추론 모델
TRANSLATION_LLM_PROVIDER=openai     # 번역 모델

# ── 모델명 ─────────────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── 런타임 설정 ────────────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # 블로킹 LLM 호출용 스레드 풀 크기

# ── 보안 ───────────────────────────────────────────────
ALLOW_USER_API_KEYS=true     # UI에서 키 입력 허용
# AUTH_TOKEN=...             # 모든 엔드포인트 보호 (Bearer 토큰)
SESSION_TTL_SECONDS=3600     # 동적 세션 토큰 유효 기간
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = 무제한
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = 무제한

# ── WebSocket 제한 ─────────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ───────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── Qwen 리전 엔드포인트 (선택 사항) ──────────────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

**비용 팁:** 기본 듀얼 LLM 구성 (DeepSeek 추론 + GPT-4o-mini 번역)은 품질을 극대화하면서 비용을 최소화합니다. API 키가 하나뿐이라면 두 제공업체를 같은 값으로 설정하세요.

전체 설정 옵션과 설명은 `.env.template`를 참조하세요.

---

## 기술 스택

| 계층 | 기술 |
|---|---|
| 프론트엔드 | React 18, TypeScript, Tailwind CSS |
| 백엔드 | FastAPI, Python 3.11, uvicorn |
| 스트리밍 | WebSocket (실시간 토큰 스트리밍) |
| LLM 제공업체 | DeepSeek, OpenAI, Anthropic/Claude, Google/Gemini, Alibaba/Qwen |
| 리버스 프록시 | nginx |
| 배포 | Docker + Docker Compose |

---

## 프로젝트 구조

```
ThinkLingo/
├── backend/
│   ├── app.py                           # FastAPI 진입점 + WebSocket + 인증 + 속도 제한
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4단계 파이프라인 코디네이터
│   ├── agents/
│   │   ├── translator_agent.py          # 언어 감지 및 번역 (코드 블록 보호)
│   │   └── questioner_agent.py          # 처리 언어 추론 (5가지 응답 유형)
│   ├── llms/
│   │   ├── base.py                      # 추상 LLM 인터페이스d
│   │   ├── deepseek_llm.py             # DeepSeek (사고 체인 지원)
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # API 키 + OAuth 이중 인증
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # 리전 엔드포인트 + 사고 모델
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplate 데이터 클래스
│   │   ├── registry.py                  # JSON에서 15개 이상 템플릿 로드
│   │   ├── router.py                    # LLM 기반 의도 분류
│   │   └── templates.json               # 전문 프롬프트 템플릿
│   └── utils/
│       ├── config.py                    # 타입 지정 설정 로더 + 검증
│       ├── llm_factory.py              # LLM 팩토리 (서버 + 요청별)
│       └── language_config.py           # 지원 언어 목록
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # 메인 오케스트레이터 (WebSocket, 상태, 스트리밍)
│   │   │   ├── DualColumnView.tsx       # 반응형 2컬럼 레이아웃
│   │   │   ├── TurnRow.tsx              # 대화 턴 (사고 + 라우팅 블록)
│   │   │   ├── MessageBubble.tsx        # 메시지 렌더러 (Markdown, 코드 복사)
│   │   │   ├── InputBar.tsx             # 입력 텍스트 영역 (IME 지원)
│   │   │   ├── ChatHistory.tsx          # 사이드바 대화 관리자
│   │   │   ├── SettingsModal.tsx        # 언어, 응답 유형, 라우팅 토글
│   │   │   └── ApiConfigModal.tsx       # 역할별 LLM 제공업체/모델/키 설정
│   │   ├── types/chat.ts               # TypeScript 인터페이스
│   │   └── utils/i18n.ts               # UI 번역 (영/중/일/한)
│   ├── Dockerfile                       # 멀티 스테이지 빌드 (Node → nginx)
│   ├── nginx-frontend.conf              # 내부 nginx SPA 라우팅 설정
│   └── tailwind.config.js               # 커스텀 void 테마 + 글래스모피즘
├── nginx/
│   ├── nginx-local.conf                 # 로컬 Docker 설정 (HTTP)
│   └── nginx.conf                       # 프로덕션 설정 (HTTPS + 속도 제한)
├── start.sh                             # 원커맨드 로컬 시작 스크립트
├── docker-compose.yml                   # 로컬 배포
├── docker-compose.prod.yml              # 프로덕션 오버레이 (HTTPS, 서브패스)
├── Dockerfile                           # 백엔드 이미지 (python:3.11-slim)
└── .env.template                        # 설정 템플릿
```

---

## API 엔드포인트

### REST

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/health` | GET | 헬스 체크 및 오케스트레이터 상태 |
| `/api/languages` | GET | 지원 언어 목록 조회 |
| `/api/response-types` | GET | 응답 유형 목록 조회 (일반, 창의적, 분석적, 교육적, 기술적) |
| `/api/session` | POST | 단기 세션 토큰 생성 (IP별 속도 제한) |
| `/api/quota` | GET | 현재 IP의 일일 메시지 잔여 할당량 조회 |
| `/api/config` | GET | 기능 플래그 및 서버 설정 제공업체 목록 |
| `/api/generate-title` | POST | 첫 메시지로 대화 제목 생성 |

### WebSocket

| 엔드포인트 | 프로토콜 | 설명 |
|---|---|---|
| `/ws/chat` | WebSocket | 4단계 워크플로우 스트리밍 채팅, 프롬프트 라우팅 및 사고 체인 표시 지원 |

---

## 확장

- **LLM 제공업체 추가** — `backend/llms/base.py`를 상속하고 `backend/utils/llm_factory.py`에 등록, `Config`와 프론트엔드 `ApiConfigModal.tsx`에 추가
- **언어 추가** — `backend/utils/language_config.py`, 에이전트 프롬프트, `frontend/src/utils/i18n.ts` 업데이트
- **응답 유형 추가** — `backend/agents/questioner_agent.py`와 `frontend/src/utils/i18n.ts` 업데이트
- **프롬프트 템플릿 추가** — `backend/prompt_router/templates.json`에 항목 추가

---

## 라이선스

[AGPL-3.0](LICENSE)
