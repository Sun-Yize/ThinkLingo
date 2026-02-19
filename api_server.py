"""
FastAPI server for the Translation-Based LLM Frontend
Provides WebSocket streaming and REST API endpoints
"""

import logging
import os
import sys
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

# Add src to Python path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.orchestrator.translation_orchestrator import TranslationOrchestrator
from src.utils.config import Config
from src.utils.llm_factory import LLMFactory

# Bounded thread pool — avoids unbounded resource consumption under load
_executor = ThreadPoolExecutor(max_workers=int(os.getenv("MAX_WORKERS", "20")))

# Global orchestrator instance
orchestrator = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the orchestrator on startup"""
    global orchestrator
    try:
        config = Config.from_env()
        llm_client = LLMFactory.create_llm(config)
        translation_llm_client = LLMFactory.create_translation_llm(config)
        orchestrator = TranslationOrchestrator(llm_client, translation_llm_client, config)
        logger.info("Translation orchestrator initialized successfully")
        yield
    except Exception as e:
        logger.error(f"Failed to initialize orchestrator: {e}")
        raise

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
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    return orchestrator.get_supported_languages()

@app.get("/api/response-types")
async def get_response_types():
    """Get list of supported response types"""
    if not orchestrator:
        raise HTTPException(status_code=500, detail="Orchestrator not initialized")

    return orchestrator.get_supported_response_types()

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

            if not orchestrator:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="initialization",
                    content="Orchestrator not initialized"
                ))
                continue

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


async def _stream_inference(questioner, prompt: str, response_type: str, conversation_history: list = None, **kwargs):
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
                conversation_history=conversation_history, **kwargs
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
        # Step 1: Input translation (if needed)
        if source_language != processing_language:
            await manager.send_message(websocket, StreamingMessage(
                type="translation_start",
                step="input_translation",
                content=f"Translating from {source_language} to {processing_language}...",
                metadata={"from": source_language, "to": processing_language}
            ))

            # Run blocking translation in thread pool so the event loop stays free
            translation_result = await asyncio.to_thread(
                orchestrator.translate_text,
                message, source_language, processing_language, translation_method
            )

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
            orchestrator.questioner, processed_input, response_type,
            conversation_history=conversation_history or None
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
                    orchestrator.translator, processed_response, processing_language, target_language
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

                translation_result = await asyncio.to_thread(
                    orchestrator.translate_text,
                    processed_response, processing_language, target_language, translation_method
                )

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
