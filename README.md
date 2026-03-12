<div align="center">

# ThinkLingo — Cross-Language Reasoning

**Multilingual LLM chat that standardizes reasoning quality by translating to a chosen processing language before inference.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[Report Bug](https://github.com/Sun-Yize/ThinkLingo/issues) · [Request Feature](https://github.com/Sun-Yize/ThinkLingo/issues)

**English** | [中文](README_CN.md)

</div>

![ThinkLingo UI](assets/img01.png)

> [!Important]
> ThinkLingo is now live! Try it at [thinklingo.yizesun.com](https://thinklingo.yizesun.com) — no setup needed.

---

## Why ThinkLingo?

LLMs produce significantly better results when reasoning in certain languages — English in particular. ThinkLingo automatically translates your input into a stronger processing language (English by default) before inference, then translates the answer back, so you get top-tier reasoning quality no matter what language you speak.

```
Your message (any language)
  → [1] Translate to processing language (English by default, configurable)
  → [2] LLM reasons in the processing language
  → [3] Translate answer back to your language
  → Streamed to your screen in real time
```

The dual-column UI shows both sides — the processing language reasoning and your native language — so you always know what's happening.

**Supports:** English · 中文 · 日本語 · 한국어

---

## Features

- **Dual-LLM architecture** — separate models for reasoning and translation, mix and match any 5 providers
- **Real-time streaming** — WebSocket-based token-by-token streaming with concurrent paragraph translation
- **Smart Prompt Routing** — automatically classifies user intent and applies specialized system prompts (code debugger, math solver, creative writer, etc.)
- **Chain-of-Thought display** — collapsible thinking blocks for reasoning models (DeepSeek-R1, Qwen thinking models)
- **Multi-conversation support** — persistent chat history with LLM-generated titles, switchable mid-stream
- **Per-session API keys** — users can supply their own keys via the UI without server configuration
- **Security & rate limiting** — token auth, dynamic sessions, per-IP quotas, WebSocket concurrency limits
- **Responsive design** — dual-column on desktop, tab-switching on mobile

---

## Quick Start

### Option A — Docker (recommended)

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
docker-compose up -d
```

Open **http://localhost:3000** — the UI will guide you to configure your API keys on first visit.

**Useful commands**

```bash
docker-compose logs -f          # tail logs
docker-compose down             # stop
docker-compose up -d --build    # rebuild after code changes
```

---

### Option B — Command Line

**Prerequisites:** Python 3.11+, Node.js 18+.

**1. Clone and configure**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

**2. Start everything with one command**

```bash
bash start.sh
```

`start.sh` installs all dependencies (first run), starts the backend on port 8000, and the frontend on port 3000. Press `Ctrl+C` to stop both.

<details>
<summary>Manual startup (without the script)</summary>

```bash
# Terminal 1 — backend
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm start
```

</details>

Open **http://localhost:3000** — done.

---

## Supported LLM Providers

ThinkLingo uses a **dual-LLM design** — one model for reasoning, another for translation. You can mix and match any combination:

| Provider | Reasoning models | Translation models | API key env var |
|---|---|---|---|
| DeepSeek | `deepseek-chat`, `deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | `gpt-3.5-turbo`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`, `claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`, `gemini-2.5-pro` | `gemini-2.5-flash`, `gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| Alibaba (Qwen) | `qwen-plus`, `qwen3-max`, `qwen3-max-thinking` | `qwen-turbo`, `qwen-plus` | `QWEN_API_KEY` |

Users can also supply their own API keys per-session via the frontend (when `ALLOW_USER_API_KEYS=true`).

---

## Configuration

All configuration lives in `.env` (copied from `.env.template`):

```bash
# ── API Keys (at least one required) ──────────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # also accepts ANTHROPIC_AUTH_TOKEN for OAuth
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── Provider Selection ────────────────────────────────────
# Supported: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # reasoning model
TRANSLATION_LLM_PROVIDER=openai     # translation model

# ── Model Names ───────────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── Runtime ───────────────────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # thread pool for blocking LLM calls

# ── Security ──────────────────────────────────────────────
ALLOW_USER_API_KEYS=true     # let users supply their own keys via UI
# AUTH_TOKEN=...             # protect all endpoints (Bearer token)
SESSION_TTL_SECONDS=3600     # dynamic session token lifetime
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = unlimited
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = unlimited

# ── WebSocket Limits ─────────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── Qwen Regional Endpoint (optional) ────────────────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

**Cost tip:** The default dual-LLM setup (DeepSeek for reasoning, GPT-4o-mini for translation) minimizes cost while maximizing quality. If you only have one API key, set both providers to the same value.

See `.env.template` for the full list of options with comments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, uvicorn |
| Streaming | WebSocket (real-time token streaming) |
| LLM Providers | DeepSeek, OpenAI, Anthropic/Claude, Google/Gemini, Alibaba/Qwen |
| Reverse Proxy | nginx |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
ThinkLingo/
├── backend/
│   ├── app.py                           # FastAPI entry point + WebSocket + auth + rate limiting
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4-step pipeline coordinator
│   ├── agents/
│   │   ├── translator_agent.py          # Language detection & translation (code-block protection)
│   │   └── questioner_agent.py          # Processing-language inference (5 response types)
│   ├── llms/
│   │   ├── base.py                      # Abstract LLM interface
│   │   ├── deepseek_llm.py             # DeepSeek (CoT thinking support)
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # API key + OAuth dual auth
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # Regional endpoints + thinking models
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplate dataclass
│   │   ├── registry.py                  # Loads 15+ templates from JSON
│   │   ├── router.py                    # LLM-based intent classification
│   │   └── templates.json               # Specialized prompt templates
│   └── utils/
│       ├── config.py                    # Typed config loader + validation
│       ├── llm_factory.py              # LLM factory (server + per-request)
│       └── language_config.py           # Supported languages
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # Main orchestrator (WebSocket, state, streaming)
│   │   │   ├── DualColumnView.tsx       # Responsive dual-column layout
│   │   │   ├── TurnRow.tsx              # Conversation turn (thinking + routing blocks)
│   │   │   ├── MessageBubble.tsx        # Message renderer (Markdown, code copy)
│   │   │   ├── InputBar.tsx             # Input textarea with IME support
│   │   │   ├── ChatHistory.tsx          # Sidebar conversation manager
│   │   │   ├── SettingsModal.tsx        # Language, response type, routing toggle
│   │   │   └── ApiConfigModal.tsx       # Per-role LLM provider/model/key config
│   │   ├── types/chat.ts               # TypeScript interfaces
│   │   └── utils/i18n.ts               # UI translations (EN/ZH/JA/KO)
│   ├── Dockerfile                       # Multi-stage build (Node → nginx)
│   ├── nginx-frontend.conf              # Internal nginx for SPA routing
│   └── tailwind.config.js               # Custom void theme + glassmorphism
├── nginx/
│   ├── nginx-local.conf                 # Local Docker config (HTTP)
│   └── nginx.conf                       # Production config (HTTPS + rate limiting)
├── tools/
│   └── bench_qwen.py                   # Qwen model benchmarking tool
├── start.sh                             # One-command local startup
├── docker-compose.yml                   # Local deployment
├── docker-compose.prod.yml              # Production overlay (HTTPS, subpath)
├── Dockerfile                           # Backend image (python:3.11-slim)
└── .env.template                        # Config template
```

---

## API Endpoints

### REST

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check and orchestrator status |
| `/api/languages` | GET | List supported languages |
| `/api/response-types` | GET | List response types (general, creative, analytical, educational, technical) |
| `/api/session` | POST | Create a short-lived session token (rate-limited per IP) |
| `/api/quota` | GET | Get remaining daily message quota for the client IP |
| `/api/config` | GET | Feature flags and available server-configured providers |
| `/api/generate-title` | POST | Generate a conversation title from the first message |

### WebSocket

| Endpoint | Protocol | Description |
|---|---|---|
| `/ws/chat` | WebSocket | Streaming chat with 4-step workflow, prompt routing, and thinking display |

---

## Extending

- **Add an LLM provider** — extend `backend/llms/base.py`, register in `backend/utils/llm_factory.py`, add to `Config` and frontend `ApiConfigModal.tsx`
- **Add a language** — update `backend/utils/language_config.py`, agent prompts, and `frontend/src/utils/i18n.ts`
- **Add a response type** — update `backend/agents/questioner_agent.py` and `frontend/src/utils/i18n.ts`
- **Add a prompt template** — add an entry to `backend/prompt_router/templates.json`

---

## License

[AGPL-3.0](LICENSE)
