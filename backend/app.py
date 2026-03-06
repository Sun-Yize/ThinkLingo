"""
FastAPI server for the Translation-Based LLM Frontend
Provides WebSocket streaming and REST API endpoints
"""

import logging
import os
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

from backend.orchestrator.translation_orchestrator import TranslationOrchestrator
from backend.utils.config import Config
from backend.utils.llm_factory import LLMFactory
from backend.utils.language_config import LanguageConfig
from backend.agents.translator_agent import TranslatorAgent
from backend.agents.questioner_agent import QuestionerAgent
import re

from backend.prompt_router import PromptRouter, TemplateRegistry

# Bounded thread pool — avoids unbounded resource consumption under load
_executor = ThreadPoolExecutor(max_workers=int(os.getenv("MAX_WORKERS", "20")))

# Global orchestrator instance
orchestrator = None

# Template registry loaded once at import time
_template_registry = TemplateRegistry()

_DEFAULT_MODELS = {
    'deepseek': 'deepseek-chat',
    'openai':   'gpt-4o-mini',
    'gpt35':    'gpt-3.5-turbo',
    'claude':   'claude-opus-4-6',
    'gemini':   'gemini-3.1-pro-preview',
    'qwen':     'qwen3.5-plus',
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the orchestrator on startup (non-fatal if no API keys configured)"""
    global orchestrator
    try:
        config = Config.from_env()
        llm_client = LLMFactory.create_llm(config)
        translation_llm_client = LLMFactory.create_translation_llm(config)
        orchestrator = TranslationOrchestrator(llm_client, translation_llm_client, config)
        logger.info("Translation orchestrator initialized successfully")
    except ValueError as e:
        logger.warning(f"Orchestrator not initialized (will use per-request keys): {e}")
    except Exception as e:
        logger.warning(f"Orchestrator not initialized (will use per-request keys): {e}")
    yield

app = FastAPI(title="Translation-Based LLM API", version="1.0.0", lifespan=lifespan)

# Configure CORS — origins from environment variable (comma-separated)
_cors_origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StreamingMessage(BaseModel):
    type: str  # 'translation_start', 'translation_complete', 'processing_start', 'processing_chunk', 'processing_complete', 'final_translation', 'error'
    step: str  # 'input_translation', 'inference', 'output_translation'
    content: str
    metadata: Optional[Dict[str, Any]] = None

# REST API Endpoints
@app.get("/api/config")
async def get_app_config():
    """Return feature flags for the frontend"""
    return {
        "allow_user_api_keys": os.getenv("ALLOW_USER_API_KEYS", "false").lower() == "true"
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Translation LLM API is running",
        "orchestrator_ready": orchestrator is not None,
    }

@app.get("/api/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    if orchestrator:
        return orchestrator.get_supported_languages()
    return LanguageConfig().get_language_pairs_for_display()

@app.get("/api/response-types")
async def get_response_types():
    """Get list of supported response types"""
    if orchestrator:
        return orchestrator.get_supported_response_types()
    return {
        "general":     "General purpose responses for everyday queries",
        "creative":    "Creative and imaginative responses",
        "analytical":  "Detailed analytical responses with structured reasoning",
        "educational": "Educational responses with clear explanations",
        "technical":   "Technical responses with precise terminology",
    }

class GenerateTitleRequest(BaseModel):
    message: str
    response: str = ""
    language: Optional[str] = None  # e.g. "chinese", "japanese" — title language
    # Per-request API key fields (same as WebSocket payload)
    deepseek_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    qwen_api_key: Optional[str] = None
    qwen_base_url: Optional[str] = None
    main_llm_provider: str = "auto"
    main_llm_model: str = ""


def _resolve_llm_for_title(data: dict):
    """Resolve an LLM client for title generation, reusing _resolve_agents key logic."""
    keys = {
        'deepseek': (data.get('deepseek_api_key') or '').strip(),
        'openai':   (data.get('openai_api_key') or '').strip(),
        'gpt35':    (data.get('openai_api_key') or '').strip(),
        'claude':   (data.get('anthropic_api_key') or '').strip(),
        'gemini':   (data.get('google_api_key') or '').strip(),
        'qwen':     (data.get('qwen_api_key') or '').strip(),
    }
    prov = data.get('main_llm_provider', 'auto')
    if prov == 'auto':
        for p in ('deepseek', 'openai', 'claude', 'gemini', 'qwen'):
            if keys[p]:
                prov = p
                break
        else:
            prov = None
    if prov and keys.get(prov):
        model = (data.get('main_llm_model') or '').strip() or _DEFAULT_MODELS.get(prov, '')
        extra = {}
        if prov == 'qwen':
            base_url = (data.get('qwen_base_url') or '').strip()
            if base_url:
                extra['base_url'] = base_url
        return LLMFactory.create_specific_llm(prov, keys[prov], model, **extra)
    if orchestrator:
        return orchestrator.questioner.llm_client
    return None


@app.post("/api/generate-title")
async def generate_title(req: GenerateTitleRequest):
    """Generate a short conversation title from the first message + response."""
    llm = _resolve_llm_for_title(req.model_dump())
    if not llm:
        # Fallback: truncate message
        title = req.message[:40] + ('…' if len(req.message) > 40 else '')
        return {"title": title}

    lang_instruction = ""
    if req.language and req.language != "english":
        lang_instruction = f" The title MUST be written in {req.language}."
    prompt = (
        "Generate a concise title (max 6 words) for a conversation that starts with the following exchange. "
        f"Only output the title text, nothing else. No quotes, no punctuation at the end.{lang_instruction}\n\n"
        f"User: {req.message[:500]}\n"
    )
    if req.response:
        prompt += f"Assistant: {req.response[:500]}\n"

    try:
        title = await asyncio.to_thread(
            llm.invoke,
            "You generate short, descriptive conversation titles.",
            prompt,
            temperature=0.3,
            max_tokens=30,
        )
        title = title.strip().strip('"\'').strip()
        if not title:
            title = req.message[:40] + ('…' if len(req.message) > 40 else '')
        return {"title": title}
    except Exception as e:
        logger.warning(f"Title generation failed: {e}")
        title = req.message[:40] + ('…' if len(req.message) > 40 else '')
        return {"title": title}


# WebSocket for streaming
class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: StreamingMessage):
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as e:
            logger.warning(f"Failed to send WebSocket message: {e}")

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    """WebSocket endpoint for streaming chat responses"""
    await manager.connect(websocket)

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()

            # Reject oversized messages (100 KB limit)
            if len(data) > 100 * 1024:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="validation",
                    content="Message too large (max 100 KB)"
                ))
                continue

            request_data = json.loads(data)

            # Process the request with streaming
            await process_streaming_chat(websocket, request_data)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.send_message(websocket, StreamingMessage(
            type="error",
            step="processing",
            content=f"Processing failed: {str(e)}"
        ))

async def _stream_translation(translator, text: str, source_language: str, target_language: str):
    """
    Async generator that wraps the synchronous LLM streaming translation generator.

    Runs the blocking sync generator in a thread pool and forwards each
    token to the async caller via an asyncio.Queue.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _producer():
        try:
            for token in translator.stream_translate(text, source_language, target_language):
                loop.call_soon_threadsafe(queue.put_nowait, token)
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, exc)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    producer_future = loop.run_in_executor(_executor, _producer)

    while True:
        item = await queue.get()
        if item is None:
            break
        if isinstance(item, Exception):
            raise item
        yield item

    await producer_future


async def _stream_inference(
    questioner,
    prompt: str,
    response_type: str,
    conversation_history: list = None,
    system_prompt_override: Optional[str] = None,
    **kwargs,
):
    """
    Async generator that wraps the synchronous LLM streaming generator.

    Runs the blocking sync generator in a thread pool and forwards each
    token to the async caller via an asyncio.Queue, so the event loop is
    never blocked.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _producer():
        try:
            for token in questioner.stream_generate_response(
                prompt, response_type=response_type,
                conversation_history=conversation_history,
                system_prompt_override=system_prompt_override,
                **kwargs
            ):
                loop.call_soon_threadsafe(queue.put_nowait, token)
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, exc)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)  # sentinel

    # Start producer in bounded thread pool without awaiting it yet
    producer_future = loop.run_in_executor(_executor, _producer)

    # Consume from queue while producer runs concurrently
    while True:
        item = await queue.get()
        if item is None:
            break
        if isinstance(item, Exception):
            raise item
        yield item

    await producer_future  # ensure thread is cleaned up


async def _stream_routing(router: PromptRouter, user_message: str, processing_language: str):
    """
    Async generator that streams routing output token by token.
    The LLM outputs [Template Label] on the first line, followed by the system prompt.
    Uses the same thread-pool + queue pattern as _stream_inference.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()

    def _producer():
        try:
            for token in router.route_stream(user_message, processing_language):
                loop.call_soon_threadsafe(queue.put_nowait, token)
        except Exception as exc:
            loop.call_soon_threadsafe(queue.put_nowait, exc)
        finally:
            loop.call_soon_threadsafe(queue.put_nowait, None)

    producer_future = loop.run_in_executor(_executor, _producer)
    while True:
        item = await queue.get()
        if item is None:
            break
        if isinstance(item, Exception):
            raise item
        yield item
    await producer_future


def _resolve_router(request_data: Dict[str, Any], translator_agent) -> Optional[PromptRouter]:
    """Return a PromptRouter if routing is enabled, else None."""
    if not request_data.get("enable_prompt_routing", False):
        return None
    return PromptRouter(llm_client=translator_agent.llm_client, registry=_template_registry)


def _resolve_agents(request_data: Dict[str, Any]):
    """
    Build (TranslatorAgent, QuestionerAgent) for this request.

    If the request carries API keys, per-request LLM instances are created.
    Otherwise falls back to the global orchestrator's agents.
    Raises ValueError if no keys are available and the orchestrator is not ready.
    """
    deepseek_key  = (request_data.get('deepseek_api_key')  or '').strip()
    openai_key    = (request_data.get('openai_api_key')    or '').strip()
    anthropic_key = (request_data.get('anthropic_api_key') or '').strip()
    google_key    = (request_data.get('google_api_key')    or '').strip()
    qwen_key      = (request_data.get('qwen_api_key')      or '').strip()
    qwen_base_url = (request_data.get('qwen_base_url')     or '').strip() or None

    main_prov   = request_data.get('main_llm_provider',        'auto')
    trans_prov  = request_data.get('translation_llm_provider', 'auto')
    main_model  = (request_data.get('main_llm_model')          or '').strip()
    trans_model = (request_data.get('translation_llm_model')   or '').strip()

    # Key lookup by provider — used when building per-request LLM instances
    _key_map: Dict[str, str] = {
        'deepseek': deepseek_key,
        'openai':   openai_key,
        'gpt35':    openai_key,
        'claude':   anthropic_key,
        'gemini':   google_key,
        'qwen':     qwen_key,
    }

    # ── Resolve main (questioner) provider ─────────────────────────
    # auto priority: deepseek → openai → claude → gemini → qwen
    if main_prov == 'auto':
        for p in ('deepseek', 'openai', 'claude', 'gemini', 'qwen'):
            if _key_map[p]:
                main_prov = p
                break
        else:
            main_prov = None

    # ── Resolve translation provider ───────────────────────────────
    # auto priority: openai → deepseek → claude → gemini → qwen
    if trans_prov == 'auto':
        for p in ('openai', 'deepseek', 'claude', 'gemini', 'qwen'):
            if _key_map[p]:
                trans_prov = p
                break
        else:
            trans_prov = None

    # Extra kwargs per provider (currently only Qwen needs base_url)
    _extra: Dict[str, Dict] = {
        'qwen': {'base_url': qwen_base_url} if qwen_base_url else {},
    }

    # Resolve final models: use per-request value, fall back to server default
    main_resolved_model  = main_model  or _DEFAULT_MODELS.get(main_prov,  '')
    trans_resolved_model = trans_model or _DEFAULT_MODELS.get(trans_prov, '')

    # ── Build questioner ───────────────────────────────────────────
    if main_prov:
        main_llm = LLMFactory.create_specific_llm(
            main_prov, _key_map[main_prov], main_resolved_model,
            **_extra.get(main_prov, {})
        )
        questioner = QuestionerAgent(main_llm)
    else:
        if orchestrator is None:
            raise ValueError("No API key provided and server has no pre-configured key")
        questioner = orchestrator.questioner

    # ── Build translator ───────────────────────────────────────────
    if trans_prov:
        trans_llm = LLMFactory.create_specific_llm(
            trans_prov, _key_map[trans_prov], trans_resolved_model,
            **_extra.get(trans_prov, {})
        )
        translator = TranslatorAgent(trans_llm)
    else:
        if orchestrator is None:
            raise ValueError("No API key provided and server has no pre-configured key")
        translator = orchestrator.translator

    return translator, questioner


async def process_streaming_chat(websocket: WebSocket, request_data: Dict[str, Any]):
    """Process chat request with streaming updates"""

    message = request_data.get("message", "")
    source_language = request_data.get("source_language", "english")
    target_language = request_data.get("target_language", "english")
    processing_language = request_data.get("processing_language", "english")
    response_type = request_data.get("response_type", "general")
    translation_method = request_data.get("translation_method", "google")
    conversation_history = request_data.get("conversation_history", [])

    # Truncate conversation history to avoid unbounded memory / token growth
    max_turns = int(os.getenv("MAX_HISTORY_TURNS", "20"))
    max_messages = max_turns * 2
    if len(conversation_history) > max_messages:
        conversation_history = conversation_history[-max_messages:]

    try:
        translator, questioner = _resolve_agents(request_data)
    except ValueError as e:
        await manager.send_message(websocket, StreamingMessage(
            type="error", step="initialization",
            content=f"No API key available: {e}"
        ))
        return

    try:
        # Step 0: Prompt Routing (optional) ────────────────────────────────
        # Runs BEFORE translation on the original user message so the router
        # sees the natural phrasing.  The generated system prompt is written
        # in the processing language.
        routed_system_prompt: Optional[str] = None
        router = _resolve_router(request_data, translator)
        if router is not None:
            await manager.send_message(websocket, StreamingMessage(
                type="prompt_routing_start",
                step="routing",
                content="",
                metadata={}
            ))

            header_buffer = ""
            header_parsed = False
            routing_label = ""
            routed_system_prompt = ""

            try:
                async for token in _stream_routing(router, message, processing_language):
                    if not header_parsed:
                        header_buffer += token
                        if "\n" in header_buffer:
                            header_line, _, remainder = header_buffer.partition("\n")
                            m = re.match(r"\[(.+?)\]", header_line.strip())
                            routing_label = m.group(1) if m else "General Assistant"
                            header_parsed = True
                            await manager.send_message(websocket, StreamingMessage(
                                type="prompt_routing_label",
                                step="routing",
                                content=routing_label,
                                metadata={"template_label": routing_label}
                            ))
                            remainder = remainder.lstrip("\n")
                            if remainder:
                                routed_system_prompt += remainder
                                await manager.send_message(websocket, StreamingMessage(
                                    type="prompt_routing_chunk",
                                    step="routing",
                                    content=remainder,
                                    metadata={}
                                ))
                    else:
                        routed_system_prompt += token
                        await manager.send_message(websocket, StreamingMessage(
                            type="prompt_routing_chunk",
                            step="routing",
                            content=token,
                            metadata={}
                        ))

                # Edge case: no newline was ever produced
                if not header_parsed:
                    m = re.match(r"\[(.+?)\]", header_buffer.strip())
                    if m:
                        routing_label = m.group(1)
                        routed_system_prompt = header_buffer[m.end():].strip()
                    else:
                        routing_label = "General Assistant"
                        routed_system_prompt = header_buffer
                    await manager.send_message(websocket, StreamingMessage(
                        type="prompt_routing_label",
                        step="routing",
                        content=routing_label,
                        metadata={"template_label": routing_label}
                    ))

                if not routed_system_prompt.strip():
                    fallback_t = _template_registry.get_fallback()
                    routed_system_prompt = fallback_t.system_prompt

            except Exception as _re:
                logger.warning(f"Prompt routing failed: {_re}, disabling routing for this request")
                routed_system_prompt = None

            await manager.send_message(websocket, StreamingMessage(
                type="prompt_routing_complete",
                step="routing",
                content=routed_system_prompt or "",
                metadata={"template_label": routing_label}
            ))

        # Step 1: Input translation (if needed) ───────────────────────────
        if source_language != processing_language:
            await manager.send_message(websocket, StreamingMessage(
                type="translation_start",
                step="input_translation",
                content=f"Translating from {source_language} to {processing_language}...",
                metadata={"from": source_language, "to": processing_language}
            ))

            if translation_method == 'llm':
                # LLM translation — stream tokens to the frontend in real time
                processed_input = ""
                async for token in _stream_translation(
                    translator, message, source_language, processing_language
                ):
                    processed_input += token
                    await manager.send_message(websocket, StreamingMessage(
                        type="input_translation_chunk",
                        step="input_translation",
                        content=token,
                        metadata={"is_final": False}
                    ))
                await manager.send_message(websocket, StreamingMessage(
                    type="translation_complete",
                    step="input_translation",
                    content=processed_input,
                    metadata={"original": message, "translated": processed_input}
                ))
            else:
                # Google translate — batch, notify start then send result
                try:
                    translated = await asyncio.to_thread(
                        translator.translate,
                        message, source_language, processing_language, 'google'
                    )
                    translation_result = {"success": True, "translated_text": translated}
                except Exception as _te:
                    translation_result = {"success": False, "error": str(_te)}
                if translation_result["success"]:
                    processed_input = translation_result["translated_text"]
                    await manager.send_message(websocket, StreamingMessage(
                        type="translation_complete",
                        step="input_translation",
                        content=processed_input,
                        metadata={"original": message, "translated": processed_input}
                    ))
                else:
                    raise Exception(f"Translation failed: {translation_result.get('error', 'Unknown error')}")
        else:
            processed_input = message
            await manager.send_message(websocket, StreamingMessage(
                type="translation_complete",
                step="input_translation",
                content=processed_input,
                metadata={"original": message, "translated": processed_input, "skipped": True}
            ))

        # Step 2: Real streaming inference — tokens arrive as the LLM generates them
        await manager.send_message(websocket, StreamingMessage(
            type="processing_start",
            step="inference",
            content="Generating response...",
            metadata={"processing_language": processing_language}
        ))

        processed_response = ""
        async for token in _stream_inference(
            questioner, processed_input, response_type,
            conversation_history=conversation_history or None,
            system_prompt_override=routed_system_prompt,
        ):
            processed_response += token
            await manager.send_message(websocket, StreamingMessage(
                type="processing_chunk",
                step="inference",
                content=token,
                metadata={"is_final": False}
            ))

        await manager.send_message(websocket, StreamingMessage(
            type="processing_complete",
            step="inference",
            content=processed_response,
            metadata={"processing_language": processing_language}
        ))

        # Step 3: Output translation (if needed)
        if processing_language != target_language:
            if translation_method == 'llm':
                # LLM translation — stream tokens to the frontend in real time
                final_response = ""
                async for token in _stream_translation(
                    translator, processed_response, processing_language, target_language
                ):
                    final_response += token
                    await manager.send_message(websocket, StreamingMessage(
                        type="output_translation_chunk",
                        step="output_translation",
                        content=token,
                        metadata={"is_final": False}
                    ))
                await manager.send_message(websocket, StreamingMessage(
                    type="final_translation",
                    step="output_translation",
                    content=final_response,
                    metadata={"original": processed_response, "translated": final_response}
                ))
            else:
                # Google translate — batch, notify start then send result
                await manager.send_message(websocket, StreamingMessage(
                    type="translation_start",
                    step="output_translation",
                    content=f"Translating from {processing_language} to {target_language}...",
                    metadata={"from": processing_language, "to": target_language}
                ))

                try:
                    translated_out = await asyncio.to_thread(
                        translator.translate,
                        processed_response, processing_language, target_language, 'google'
                    )
                    translation_result = {"success": True, "translated_text": translated_out}
                except Exception as _te:
                    translation_result = {"success": False, "error": str(_te)}

                if translation_result["success"]:
                    final_response = translation_result["translated_text"]
                    await manager.send_message(websocket, StreamingMessage(
                        type="final_translation",
                        step="output_translation",
                        content=final_response,
                        metadata={"original": processed_response, "translated": final_response}
                    ))
                else:
                    raise Exception(f"Output translation failed: {translation_result.get('error', 'Unknown error')}")
        else:
            final_response = processed_response
            await manager.send_message(websocket, StreamingMessage(
                type="final_translation",
                step="output_translation",
                content=final_response,
                metadata={"original": processed_response, "translated": final_response, "skipped": True}
            ))

    except Exception as e:
        await manager.send_message(websocket, StreamingMessage(
            type="error",
            step="processing",
            content=f"Error: {str(e)}"
        ))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
