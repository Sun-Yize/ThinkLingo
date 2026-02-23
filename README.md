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

**Prerequisites:** Python 3.11+, Node.js 18+, a DeepSeek API key and/or OpenAI API key.

**1. Clone and configure**

```bash
git clone https://github.com/Sun-Yize/ThinkLingo.git
cd ThinkLingo
cp .env.template .env
```

Open `.env` and fill in your API keys (at minimum `DEEPSEEK_API_KEY` and `OPENAI_API_KEY`).

**2. Start the backend**

```bash
pip install -r requirements.txt
uvicorn api_server:app --reload --port 8000
```

**3. Start the frontend** (in a new terminal)

```bash
cd frontend
npm install
npm start
```

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

## Configuration

All configuration lives in `.env` (copied from `.env.template`):

```bash
# Required — at least one of these
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key

# Which model handles reasoning (default: deepseek)
DEFAULT_LLM_PROVIDER=deepseek        # deepseek | openai

# Which model handles translation — GPT-3.5 is fast and cheap (default: gpt35)
TRANSLATION_LLM_PROVIDER=gpt35       # gpt35 | openai | deepseek

# Model names
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
GPT35_MODEL=gpt-3.5-turbo

# Tuning
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
MAX_HISTORY_TURNS=20

# CORS — must match the origin your browser connects from
CORS_ORIGINS=http://localhost:3000
```

**Cost tip:** The default dual-LLM setup (DeepSeek for reasoning, GPT-3.5 for translation) minimizes cost while maximizing quality. If you only have one API key, set both providers to the same value.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, uvicorn |
| Streaming | WebSocket (real-time token streaming) |
| Reasoning LLM | DeepSeek `deepseek-chat` (default) |
| Translation LLM | OpenAI `gpt-3.5-turbo` (default) |
| Reverse Proxy | nginx |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
ThinkLingo/
├── api_server.py                        # FastAPI entry point + WebSocket
├── src/
│   ├── orchestrator/
│   │   └── translation_orchestrator.py  # 4-step pipeline coordinator
│   ├── agents/
│   │   ├── translator_agent.py          # Language detection & translation
│   │   └── questioner_agent.py          # English-language inference
│   ├── llms/
│   │   ├── base.py                      # Abstract LLM interface
│   │   ├── deepseek_llm.py
│   │   ├── openai_llm.py
│   │   └── gpt35_llm.py
│   └── utils/
│       ├── config.py                    # Typed config loader
│       ├── llm_factory.py               # LLM factory
│       └── language_config.py           # Supported languages
├── frontend/                            # React + TypeScript SPA
├── nginx/
│   ├── nginx-local.conf                 # Local Docker config
│   └── nginx.conf                       # Production config (HTTPS)
├── docker-compose.yml                   # Local deployment
├── docker-compose.prod.yml              # Production overlay
├── Dockerfile                           # Backend image
└── .env.template                        # Config template
```

---

## Extending

- **Add an LLM provider** — extend `src/llms/base.py`, register in `src/utils/llm_factory.py`
- **Add a language** — update `src/utils/language_config.py`, agent prompts, and `frontend/src/utils/i18n.ts`
- **Add a response type** — update `src/utils/config.py` and `frontend/src/utils/i18n.ts`

---

## License

[MIT](LICENSE)
