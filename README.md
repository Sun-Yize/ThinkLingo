<div align="center">

# ThinkLingo

**Multilingual LLM chat that always reasons in English — for consistent, high-quality answers across any language.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[Live Demo](https://www.yizesun.com/ThinkLingo) · [Report Bug](https://github.com/Sun-Yize/ThinkLingo/issues) · [Request Feature](https://github.com/Sun-Yize/ThinkLingo/issues)

</div>

![ThinkLingo UI](assets/img01.png)

---

## Why ThinkLingo?

LLMs perform best when reasoning in English. ThinkLingo exploits this by silently translating every message to English before inference, then translating the answer back — giving you English-grade reasoning quality in any language.

```
Your message (any language)
  → [1] Translate to English
  → [2] LLM reasons in English
  → [3] Translate answer back
  → Streamed to your screen in real time
```

The dual-column UI shows both sides — the English reasoning and your native language — so you always know what's happening.

**Supports:** English · 中文 · 日本語 · 한국어

---

## Quick Start

### Option A — Command Line

**Prerequisites:** Python 3.11+, Node.js 18+, at least one LLM API key.

**1. Clone and configure**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

Open `.env` and fill in at least one API key (see [Configuration](#configuration) below).

**2. Start everything with one command**

```bash
bash start.sh
```

`start.sh` installs all dependencies (first run), starts the backend on port 8000, and starts the frontend on port 3000. Press `Ctrl+C` to stop both.

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

### Option B — Docker

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/).

**1. Clone and configure**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

Open `.env` and fill in your API keys.

**2. Build and run**

```bash
docker-compose up -d
```

Open **http://localhost:3000** — done.

**Useful commands**

```bash
docker-compose logs -f          # tail logs
docker-compose down             # stop
docker-compose up -d --build    # rebuild after code changes
```

---

## Supported LLM Providers

ThinkLingo uses a **dual-LLM design** — one model for reasoning, another for translation. You can mix and match any combination:

| Provider | Reasoning models | Translation models | API key env var |
|---|---|---|---|
| DeepSeek | `deepseek-chat`, `deepseek-reasoner` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| OpenAI | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | `gpt-3.5-turbo`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| Anthropic | `claude-opus-4-6`, `claude-sonnet-4-6` | `claude-haiku-4-5-20251001` | `ANTHROPIC_API_KEY` |
| Google | `gemini-3.1-pro-preview`, `gemini-2.5-pro` | `gemini-2.5-flash` | `GOOGLE_API_KEY` |
| Alibaba (Qwen) | `qwen3.5-plus`, `qwen3-max` | `qwen-turbo`, `qwen-plus` | `QWEN_API_KEY` |

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
QWEN_MODEL=qwen3.5-plus

# ── Runtime ───────────────────────────────────────────────
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20
MAX_WORKERS=40               # thread pool for blocking LLM calls

# ── Security ──────────────────────────────────────────────
ALLOW_USER_API_KEYS=true     # let users supply their own keys via UI
# AUTH_TOKEN=...             # protect all endpoints (Bearer token)
DAILY_MESSAGE_QUOTA_PER_IP=200  # 0 = unlimited

# ── CORS ──────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:3000
```

**Cost tip:** The default dual-LLM setup (DeepSeek for reasoning, GPT-3.5 for translation) minimizes cost while maximizing quality. If you only have one API key, set both providers to the same value.

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
│   ├── app.py                           # FastAPI entry point + WebSocket
│   ├── prompt_router.py                 # Smart prompt routing per message
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4-step pipeline coordinator
│   ├── agents/
│   │   ├── translator_agent.py          # Language detection & translation
│   │   └── questioner_agent.py          # Processing-language inference
│   ├── llms/
│   │   ├── base.py                      # Abstract LLM interface
│   │   ├── deepseek_llm.py
│   │   ├── openai_llm.py
│   │   ├── claude_llm.py
│   │   ├── gemini_llm.py
│   │   └── qwen_llm.py
│   └── utils/
│       ├── config.py                    # Typed config loader
│       ├── llm_factory.py              # LLM factory
│       └── language_config.py           # Supported languages
├── frontend/                            # React + TypeScript SPA
├── nginx/
│   ├── nginx-local.conf                 # Local Docker config
│   └── nginx.conf                       # Production config (HTTPS + rate limiting)
├── start.sh                             # One-command local startup
├── docker-compose.yml                   # Local deployment
├── docker-compose.prod.yml              # Production overlay (HTTPS, subpath)
├── Dockerfile                           # Backend image
└── .env.template                        # Config template
```

---

## Extending

- **Add an LLM provider** — extend `backend/llms/base.py`, register in `backend/utils/llm_factory.py`, add to `Config` and frontend `ApiConfigModal.tsx`
- **Add a language** — update `backend/utils/language_config.py`, agent prompts, and `frontend/src/utils/i18n.ts`
- **Add a response type** — update `backend/agents/questioner_agent.py` and `frontend/src/utils/i18n.ts`

---

## Deployment

See [DEPLOY.md](DEPLOY.md) for a full self-hosting guide with HTTPS, rate limiting, and authentication.

---

## License

[MIT](LICENSE)
