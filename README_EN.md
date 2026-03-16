<div align="center">

# ThinkLingo: The LLM Reasoning Engine That Breaks Language Barriers

**Ask in your native language, reason in English — eliminate the non-English "intelligence tax" and unlock 100% of your LLM's reasoning potential.**

![Demo](assets/thinklingo_demo.gif)

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[English](README_EN.md) | [**中文**](README.md) | [日本語](README_JA.md) | [한국어](README_KO.md)

</div>

> [!Important]
> 🎉 **ThinkLingo is now live!**
> Try it instantly at [thinklingo.yizesun.com](https://thinklingo.yizesun.com) — no setup required.

---

## Why ThinkLingo?

**The problem:** It's well known that mainstream large language models (LLMs) are predominantly trained on English data. When you ask complex logic, code, or math questions in a non-English language (e.g., Chinese, Japanese), the model's reasoning ability often degrades significantly — a phenomenon sometimes called the "intelligence tax" of non-English prompting.

**The solution:** ThinkLingo solves this elegantly. Behind the scenes, it automatically translates your input into the model's strongest "processing language" (English by default), lets the model reason at peak performance, and then seamlessly translates the high-quality answer back into your native language.

### Key Advantages

- **Break the performance ceiling**: No matter what language you use, you get reasoning quality on par with native English prompts.
- **Maximum cost efficiency (dual-model architecture)**: Pair a cheap, fast model (e.g., GPT-4o-mini) for translation with a powerful, premium model (e.g., DeepSeek-Reasoner / Claude 3.5 Sonnet) for heavy reasoning — top-tier quality at a fraction of the API cost.
- **Full transparency**: A unique dual-column UI shows the model's raw reasoning process (including chain-of-thought) on one side and the native-language translation on the other, so you can always inspect the model's thinking.

**Workflow demo:**
![Workflow](assets/img02.png)

---

## User Guide

<table>
<tr>
<td width="50%">

![Model Mix & Match](https://github.com/user-attachments/assets/5ed1e3b2-795c-4924-87c4-1f6f18e3f209)

</td>
<td width="50%">

![Language Selection](https://github.com/user-attachments/assets/80664072-617a-46d5-a6a5-7145fe93bf54)

</td>
</tr>
<tr>
<td align="center"><b>Model Mix & Match</b><br/>Dual-LLM architecture — freely combine reasoning and translation models for the best balance of quality and cost. Supports DeepSeek, OpenAI, Claude, Gemini, and Qwen.</td>
<td align="center"><b>Language Selection</b><br/>Supports Chinese, English, Japanese, and Korean. Freely switch source and processing languages, with the UI automatically localizing.</td>
</tr>
<tr>
<td width="50%">

![Theme Switching](https://github.com/user-attachments/assets/5417519a-433c-430c-9666-66c2440b2a23)

</td>
<td width="50%">

![Smart Prompt Routing](https://github.com/user-attachments/assets/71c5b1bd-b675-4e20-837e-e2d08eeab38f)

</td>
</tr>
<tr>
<td align="center"><b>Theme Switching</b><br/>Multiple built-in themes with one-click light/dark mode toggle for a personalized cross-language chat experience.</td>
<td align="center"><b>Smart Prompt Routing</b><br/>Built-in intent recognition automatically classifies your query (code debugging, math solving, creative writing, etc.) and injects a specialized system prompt.</td>
</tr>
</table>

---

## Getting Started

### Option 1: Docker Deployment (Recommended)

**Prerequisites:** [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

```bash
# 1. Clone the repository
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo

# 2. Start with one command
docker-compose up -d
```

Once running, open **<http://localhost:3000>** in your browser. On first visit, the UI will guide you through API key configuration.

> **Useful maintenance commands:**
> - `docker-compose logs -f` — view live logs
> - `docker-compose down` — stop and remove containers
> - `docker-compose up -d --build` — rebuild after code changes

---

### Option 2: Run from Source

**Prerequisites:** Python 3.11+, Node.js 18+.

```bash
# 1. Clone and prepare config
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env

# 2. Run the startup script
bash start.sh
```
The script automatically installs dependencies and starts the backend on port `8000` and the frontend on port `3000`. Press `Ctrl+C` to stop all services.

<details>
<summary>Manual step-by-step startup (without the script)</summary>

```bash
# Terminal 1 — Backend
pip install -r requirements.txt
uvicorn backend.app:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm start
```

</details>

---

## Supported LLM Providers

ThinkLingo uses a **dual-LLM architecture** — you can freely mix and match reasoning and translation models:

| Provider | Reasoning Models | Translation Models | API Key Env Var |
|---|---|---|---|
| DeepSeek | `deepseek-chat`, `deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | `gpt-3.5-turbo`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`, `claude-sonnet-4-5` | `claude-haiku-4-5` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`, `gemini-2.5-pro` | `gemini-2.5-flash`, `gemini-2.5-flash-lite` | `GOOGLE_API_KEY` |
| Alibaba (Qwen) | `qwen-plus`, `qwen3-max`, `qwen3-max-thinking` | `qwen-turbo`, `qwen-plus` | `QWEN_API_KEY` |

Users can also supply their own API keys for the current session via the frontend UI (requires `ALLOW_USER_API_KEYS=true`).

---

## Configuration

All settings live in the `.env` file (copied from `.env.template`):

```bash
# ── API Keys (at least one required) ──────────────────
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...       # Also supports ANTHROPIC_AUTH_TOKEN (OAuth)
GOOGLE_API_KEY=...
QWEN_API_KEY=...

# ── Provider Selection ────────────────────────────────
# Options: deepseek | openai | claude | gemini | qwen
DEFAULT_LLM_PROVIDER=deepseek       # Reasoning model
TRANSLATION_LLM_PROVIDER=openai     # Translation model

# ── Model Names ───────────────────────────────────────
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
CLAUDE_MODEL=claude-opus-4-6
GEMINI_MODEL=gemini-3.1-pro-preview
QWEN_MODEL=qwen-plus

# ── Runtime Settings ──────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # Thread pool size for blocking LLM calls

# ── Security ──────────────────────────────────────────
ALLOW_USER_API_KEYS=true     # Allow users to supply their own keys via the UI
# AUTH_TOKEN=...             # Protect all endpoints (Bearer token)
SESSION_TTL_SECONDS=3600     # Dynamic session token lifetime
MAX_SESSIONS_PER_IP_PER_HOUR=0   # 0 = unlimited
DAILY_MESSAGE_QUOTA_PER_IP=0     # 0 = unlimited

# ── WebSocket Limits ──────────────────────────────────
MAX_WS_CONNECTIONS=200
MAX_WS_CONNECTIONS_PER_IP=5
WS_RATE_LIMIT_PER_SEC=5

# ── CORS ──────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000

# ── Qwen Regional Endpoint (optional) ────────────────
# QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

> **Cost-saving tip:** Use `DeepSeek-Reasoner` or `Claude 3.5 Sonnet` for reasoning paired with `GPT-4o-mini` or `Gemini 2.5 Flash` for translation. This gives you best-in-class logic at minimal translation cost.

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
│   ├── app.py                           # FastAPI entry + WebSocket + auth + rate limiting
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # Four-step pipeline orchestrator
│   ├── agents/
│   │   ├── translator_agent.py          # Language detection & translation (code block protection)
│   │   └── questioner_agent.py          # Processing-language reasoning (5 response types)
│   ├── llms/
│   │   ├── base.py                      # Abstract LLM interface
│   │   ├── deepseek_llm.py             # DeepSeek (chain-of-thought support)
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py               # API key + OAuth dual authentication
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py                 # Regional endpoints + thinking models
│   ├── prompt_router/
│   │   ├── models.py                    # PromptTemplate dataclass
│   │   ├── registry.py                  # Loads 15+ templates from JSON
│   │   ├── router.py                    # LLM-based intent classification
│   │   └── templates.json               # Expert prompt templates
│   └── utils/
│       ├── config.py                    # Typed config loader + validation
│       ├── llm_factory.py              # LLM factory (server-side + per-request)
│       └── language_config.py           # Supported language definitions
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TranslationChat.tsx      # Main orchestrator (WebSocket, state, streaming)
│   │   │   ├── DualColumnView.tsx       # Responsive dual-column layout
│   │   │   ├── TurnRow.tsx              # Conversation turn (thinking + routing blocks)
│   │   │   ├── MessageBubble.tsx        # Message renderer (Markdown, code copy)
│   │   │   ├── InputBar.tsx             # Input textarea (IME-aware)
│   │   │   ├── ChatHistory.tsx          # Sidebar conversation manager
│   │   │   ├── SettingsModal.tsx        # Language, response type, routing toggle
│   │   │   └── ApiConfigModal.tsx       # Per-role LLM provider/model/key config
│   │   ├── types/chat.ts               # TypeScript interfaces
│   │   └── utils/i18n.ts               # UI translations (EN/CN/JA/KO)
│   ├── Dockerfile                       # Multi-stage build (Node → nginx)
│   ├── nginx-frontend.conf              # Internal nginx SPA routing config
│   └── tailwind.config.js               # Custom void theme + glassmorphism
├── nginx/
│   ├── nginx-local.conf                 # Local Docker config (HTTP)
│   └── nginx.conf                       # Production config (HTTPS + rate limiting)
├── tools/
│   └── bench_qwen.py                   # Qwen model benchmarking tool
├── start.sh                             # One-command local startup script
├── docker-compose.yml                   # Local deployment
├── docker-compose.prod.yml              # Production overrides (HTTPS, subpath)
├── Dockerfile                           # Backend image (python:3.11-slim)
└── .env.template                        # Configuration template
```

---

## API Endpoints

### REST

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check and orchestrator status |
| `/api/languages` | GET | List supported languages |
| `/api/response-types` | GET | List response types (general, creative, analytical, educational, technical) |
| `/api/session` | POST | Create a short-lived session token (per-IP rate limited) |
| `/api/quota` | GET | Get remaining daily message quota for the current IP |
| `/api/config` | GET | Feature flags and available server-configured providers |
| `/api/generate-title` | POST | Generate a conversation title from the first message |

### WebSocket

| Endpoint | Protocol | Description |
|---|---|---|
| `/ws/chat` | WebSocket | Streaming conversation with four-step workflow, prompt routing, and chain-of-thought display |

---

## Contributing

Contributions of all kinds are welcome — whether it's filing bugs, adding new LLM providers, or improving the frontend UI:
- **Add an LLM provider**: Extend `backend/llms/base.py` and register it in `backend/utils/llm_factory.py` and the frontend `ApiConfigModal.tsx`.
- **Add a language**: Update `backend/utils/language_config.py` and `frontend/src/utils/i18n.ts`.
- **Add a prompt template**: Simply add an entry to `backend/prompt_router/templates.json`.

---

## License

This project is open-sourced under the [AGPL-3.0 License](LICENSE).
