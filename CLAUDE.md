# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack multilingual LLM chat application. The core idea: standardize LLM reasoning quality by forcing inference to happen in English regardless of user input language. Supports English, Chinese, Japanese, and Korean.

**Stack**: React + TypeScript frontend (port 3000) + FastAPI backend (port 8000), communicating via WebSocket for real-time streaming.

## Development Commands

### Backend
```bash
# From project root
pip install -r requirements.txt
cp .env.template .env   # then add API keys

# Start FastAPI server (required for frontend)
uvicorn api_server:app --reload --port 8000

# CLI-only testing (no frontend needed)
python main.py
```

### Frontend
```bash
# From frontend/
npm install
npm start      # dev server at http://localhost:3000
npm run build  # production build
```

The frontend proxies all `/api/*` and `/ws/*` requests to `http://localhost:8000` (configured in `frontend/package.json`).

## Architecture

### 4-Step Translation Workflow
```
User Input (any language)
    → Pre-Translation (→ English, via LLM or Google fallback)
    → Core Inference (English only, for consistent quality)
    → Post-Translation (→ target language)
    → Streamed to frontend via WebSocket
```

### Backend (`api_server.py` + `src/`)
- **`api_server.py`**: FastAPI app entry point. Initializes the orchestrator on startup and exposes:
  - `GET /api/health`, `GET /api/languages`, `GET /api/response-types` — config endpoints
  - `POST /api/chat` — non-streaming chat
  - `WS /ws/chat` — streaming WebSocket (primary path used by frontend)
- **`src/orchestrator/translation_orchestrator.py`**: Coordinates the full 4-step workflow
- **`src/agents/translator_agent.py`**: Language detection + translation (LLM-primary, Google fallback)
- **`src/agents/questioner_agent.py`**: Runs inference in English
- **`src/llms/`**: LLM providers (`base.py` abstract class; `deepseek_llm.py`, `openai_llm.py`, `gpt35_llm.py`)
- **`src/utils/llm_factory.py`**: Factory pattern — call `LLMFactory.create_llm(config)` for main LLM, `create_translation_llm(config)` for the translation LLM
- **`src/utils/config.py`**: Loads `.env` into a typed `Config` object

### Dual-LLM Design
Two separate LLM instances run simultaneously:
- **Main LLM** (DeepSeek by default): core reasoning/QA
- **Translation LLM** (GPT-3.5 by default): fast/cheap translations

### Frontend (`frontend/src/`)
- **`components/TranslationChat.tsx`**: Root component — manages WebSocket connection and top-level state
- **`components/ChatInput.tsx`**: Language/response-type selectors, message textarea
- **`components/MessageDisplay.tsx`**: Renders messages with Markdown support
- **`components/ProcessVisualization.tsx`**: Real-time 3-step pipeline visualization (right panel)
- **`types/chat.ts`**: All shared TypeScript interfaces (`ChatMessage`, `ProcessingStep`, `WebSocketMessage`, `ChatSettings`)

### WebSocket Message Protocol
Messages sent from backend during streaming:
```
type: 'translation_start' | 'translation_complete' | 'processing_start' | 'processing_chunk' | 'processing_complete' | 'final_translation' | 'error'
step: 'input_translation' | 'inference' | 'output_translation'
content: string
metadata?: object
```

## Configuration (`.env`)

```bash
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...

DEFAULT_LLM_PROVIDER=deepseek      # main processing (deepseek | openai)
TRANSLATION_LLM_PROVIDER=gpt35    # translation (gpt35 | openai)

DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
GPT35_MODEL=gpt-3.5-turbo

DEFAULT_RESPONSE_TYPE=general
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
```

## Extending the Codebase

- **New LLM provider**: Extend `src/llms/base.py`, register in `src/utils/llm_factory.py`
- **New language**: Update `src/utils/language_config.py` and agent prompts
- **New response type**: Update `src/utils/config.py` (backend) and `frontend/src/types/chat.ts` (frontend)
