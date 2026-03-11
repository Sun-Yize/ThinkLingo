"""
FastAPI server for the Translation-Based LLM Frontend
Provides WebSocket streaming and REST API endpoints
"""

import logging
import os
import asyncio
import json
import time
import hmac
import secrets
import sqlite3
import tempfile
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from datetime import date
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from starlette.status import WS_1008_POLICY_VIOLATION

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

# --- Security: SSRF prevention — only these Qwen base URLs are permitted ---
_ALLOWED_QWEN_BASE_URLS = {
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
}

# --- Security: Optional authentication via AUTH_TOKEN env var ---
_AUTH_TOKEN = os.getenv("AUTH_TOKEN", "").strip()
_http_bearer = HTTPBearer(auto_error=False)


def _sanitize_error(exc: Exception) -> str:
    """Return a generic error message, stripping any sensitive details (API keys, headers, URLs)."""
    # Never forward raw exception strings — they may contain credentials
    exc_type = type(exc).__name__
    safe_types = {
        "ValueError": "Invalid input or configuration",
        "ConnectionError": "Failed to connect to upstream service",
        "TimeoutError": "Request timed out",
        "Timeout": "Request timed out",
    }
    return safe_types.get(exc_type, "An internal error occurred. Please try again.")


def _validate_qwen_base_url(url: Optional[str]) -> Optional[str]:
    """Validate that a user-supplied Qwen base URL is on the allowlist. Returns the URL or None."""
    if not url:
        return None
    url = url.strip().rstrip("/")
    for allowed in _ALLOWED_QWEN_BASE_URLS:
        if url == allowed.rstrip("/"):
            return url
    logger.warning(f"Rejected disallowed qwen_base_url: {url!r}")
    return None


# --- Dynamic Session Management (SQLite-backed, safe across workers) ---
_SESSION_DB_PATH = os.path.join(tempfile.gettempdir(), "thinklingo_sessions.db")


class SessionManager:
    """Manages short-lived session tokens bound to client IP.

    Uses SQLite for storage so that multiple uvicorn workers share the same
    session state.  Each thread/worker opens its own connection (SQLite
    serialises writes via its own locking, so no external lock is needed).
    """

    def __init__(self, ttl_seconds: int = 3600, max_sessions_per_ip_per_hour: int = 10):
        self._ttl = ttl_seconds
        self._max_per_hour = max_sessions_per_ip_per_hour
        self._init_db()

    # -- internal helpers --------------------------------------------------

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(_SESSION_DB_PATH, timeout=5)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    token      TEXT PRIMARY KEY,
                    ip         TEXT NOT NULL,
                    expires_at REAL NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS creation_log (
                    ip         TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_ip ON sessions(ip)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_clog_ip ON creation_log(ip)")

    # -- public API --------------------------------------------------------

    def create_session(self, ip: str) -> Optional[str]:
        """Create a new session token for the given IP. Returns None if rate limited."""
        now = time.time()
        with self._conn() as conn:
            # Rate limit session creation per IP (0 = unlimited)
            if self._max_per_hour > 0:
                conn.execute("DELETE FROM creation_log WHERE created_at < ?", (now - 3600,))
                row = conn.execute(
                    "SELECT COUNT(*) FROM creation_log WHERE ip = ?", (ip,)
                ).fetchone()
                if row and row[0] >= self._max_per_hour:
                    return None
            token = secrets.token_urlsafe(32)
            conn.execute(
                "INSERT INTO sessions (token, ip, expires_at) VALUES (?, ?, ?)",
                (token, ip, now + self._ttl),
            )
            conn.execute(
                "INSERT INTO creation_log (ip, created_at) VALUES (?, ?)",
                (ip, now),
            )
        return token

    def validate_session(self, token: str, ip: str) -> bool:
        """Validate a session token. Must match IP and not be expired."""
        if not token:
            return False
        now = time.time()
        with self._conn() as conn:
            row = conn.execute(
                "SELECT ip, expires_at FROM sessions WHERE token = ?", (token,)
            ).fetchone()
            if not row:
                return False
            if now > row[1]:
                conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
                return False
            return row[0] == ip

    def cleanup(self):
        """Remove expired sessions and stale creation logs."""
        now = time.time()
        with self._conn() as conn:
            conn.execute("DELETE FROM sessions WHERE expires_at < ?", (now,))
            conn.execute("DELETE FROM creation_log WHERE created_at < ?", (now - 3600,))


# --- Per-IP Daily Message Quota (SQLite-backed, safe across workers) ---
_QUOTA_DB_PATH = os.path.join(tempfile.gettempdir(), "thinklingo_quota.db")


class IPQuotaManager:
    """Tracks per-IP daily message counts and enforces quotas.

    Uses SQLite so counters are shared across uvicorn workers.
    """

    def __init__(self, daily_limit: int = 200):
        self._daily_limit = daily_limit
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(_QUOTA_DB_PATH, timeout=5)
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self):
        with self._conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS quota (
                    ip         TEXT NOT NULL,
                    day        TEXT NOT NULL,
                    count      INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (ip, day)
                )
            """)

    @property
    def daily_limit(self) -> int:
        return self._daily_limit

    def check_and_increment(self, ip: str) -> tuple[bool, int]:
        """
        Check if IP is within daily quota and increment counter.
        Returns (allowed: bool, remaining: int).
        A daily_limit of 0 means unlimited.
        """
        if self._daily_limit <= 0:
            return True, -1  # unlimited
        today = date.today().isoformat()
        with self._conn() as conn:
            row = conn.execute(
                "SELECT count FROM quota WHERE ip = ? AND day = ?", (ip, today)
            ).fetchone()
            current = row[0] if row else 0
            if current >= self._daily_limit:
                return False, 0
            conn.execute(
                "INSERT INTO quota (ip, day, count) VALUES (?, ?, 1) "
                "ON CONFLICT(ip, day) DO UPDATE SET count = count + 1",
                (ip, today),
            )
            return True, self._daily_limit - current - 1

    def get_remaining(self, ip: str) -> int:
        """Get remaining quota for an IP. Returns -1 if unlimited."""
        if self._daily_limit <= 0:
            return -1
        today = date.today().isoformat()
        with self._conn() as conn:
            row = conn.execute(
                "SELECT count FROM quota WHERE ip = ? AND day = ?", (ip, today)
            ).fetchone()
            current = row[0] if row else 0
            return max(0, self._daily_limit - current)

    def cleanup(self):
        """Remove stale entries from past days."""
        today = date.today().isoformat()
        with self._conn() as conn:
            conn.execute("DELETE FROM quota WHERE day < ?", (today,))


_session_manager = SessionManager(
    ttl_seconds=int(os.getenv("SESSION_TTL_SECONDS", "3600")),
    max_sessions_per_ip_per_hour=int(os.getenv("MAX_SESSIONS_PER_IP_PER_HOUR", "0")),
)
_ip_quota = IPQuotaManager(
    daily_limit=int(os.getenv("DAILY_MESSAGE_QUOTA_PER_IP", "0")),
)


def _get_client_ip(request) -> str:
    """Extract client IP, respecting X-Forwarded-For from trusted proxies."""
    forwarded = None
    if hasattr(request, 'headers'):
        forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if hasattr(request, 'client') and request.client:
        return request.client.host
    return "unknown"


async def _verify_auth_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_http_bearer),
):
    """Dependency that enforces authentication via static AUTH_TOKEN or dynamic session token."""
    # If no AUTH_TOKEN configured and sessions are not required, allow through
    if not _AUTH_TOKEN:
        return

    # Check static AUTH_TOKEN first
    if credentials and credentials.credentials:
        if hmac.compare_digest(credentials.credentials, _AUTH_TOKEN):
            return
        # Could be a session token — validate it
        ip = _get_client_ip(request)
        if _session_manager.validate_session(credentials.credentials, ip):
            return

    raise HTTPException(status_code=401, detail="Invalid or missing authentication token")


# Bounded thread pool — avoids unbounded resource consumption under load
_executor = ThreadPoolExecutor(max_workers=int(os.getenv("MAX_WORKERS", "40")))

# Concurrency limits
_MAX_CONNECTIONS = int(os.getenv("MAX_WS_CONNECTIONS", "200"))
_MAX_CONNECTIONS_PER_IP = int(os.getenv("MAX_WS_CONNECTIONS_PER_IP", "5"))
_STREAM_QUEUE_MAXSIZE = 2000  # backpressure: max buffered tokens per stream
_WS_RATE_LIMIT_PER_SEC = int(os.getenv("WS_RATE_LIMIT_PER_SEC", "5"))  # max messages per second per connection

# --- Paragraph-aware buffer for chunked translation ---
_MIN_FLUSH_LINES = 5    # minimum newlines before considering a flush
_MIN_FLUSH_CHARS = 500  # OR minimum characters before considering a flush

class ParagraphBuffer:
    """Accumulates inference tokens and flushes at paragraph boundaries."""

    def __init__(self, min_lines: int = _MIN_FLUSH_LINES, min_chars: int = _MIN_FLUSH_CHARS):
        self._buf = ""
        self._min_lines = min_lines
        self._min_chars = min_chars
        self._fence_open = False  # inside a fenced code block?

    def feed(self, token: str) -> Optional[str]:
        """Feed a token. Returns a chunk to translate if a flush point is reached."""
        self._buf += token
        # Track fenced code blocks (``` toggles)
        for line in token.split('\n'):
            if line.strip().startswith('```'):
                self._fence_open = not self._fence_open
        # Never flush inside a code fence
        if self._fence_open:
            return None
        # Need at least min_lines OR min_chars
        if self._buf.count('\n') < self._min_lines and len(self._buf) < self._min_chars:
            return None
        # Find the last paragraph boundary (\n\n) that is NOT inside a fenced
        # code block.  Split buffer into lines and walk them to track fence state.
        buf = self._buf
        lines = buf.split('\n')
        fence = False
        # Record char offset of each \n\n that is outside a fence
        safe_split = -1
        offset = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('```'):
                fence = not fence
            # A \n\n occurs between two consecutive empty-line boundaries:
            # after this line's trailing \n, if the next char is also \n.
            line_end = offset + len(line)  # position of the \n after this line
            if i < len(lines) - 1:
                # Check if this line boundary is a \n\n (current line ends, next starts)
                # In the original string, position line_end is '\n'.
                # A double newline means the next line is empty OR we have \n\n at line_end.
                if not fence and line_end + 1 < len(buf) and buf[line_end:line_end+2] == '\n\n':
                    safe_split = line_end
                offset = line_end + 1  # skip the \n
            else:
                offset = line_end
        if safe_split < 0:
            return None
        # Split: flush everything up to and including the \n\n
        chunk = buf[:safe_split + 2]
        self._buf = buf[safe_split + 2:]
        return chunk

    def flush(self) -> Optional[str]:
        """Flush any remaining buffered text."""
        if self._buf:
            chunk = self._buf
            self._buf = ""
            return chunk
        return None


# Global orchestrator instance
orchestrator = None

# Template registry loaded once at import time
_template_registry = TemplateRegistry()

_DEFAULT_MODELS = {
    'deepseek': 'deepseek-chat',
    'openai':   'gpt-4o-mini',
    'claude':   'claude-opus-4-6',
    'gemini':   'gemini-3.1-pro-preview',
    'qwen':     'qwen-plus',
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

    # Periodic cleanup task for sessions and quotas
    async def _periodic_cleanup():
        while True:
            await asyncio.sleep(600)  # every 10 minutes
            _session_manager.cleanup()
            _ip_quota.cleanup()

    cleanup_task = asyncio.create_task(_periodic_cleanup())
    yield
    cleanup_task.cancel()

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
@app.get("/api/config", dependencies=[Depends(_verify_auth_token)])
async def get_app_config():
    """Return feature flags and available server-side providers for the frontend"""
    allow_user_keys = os.getenv("ALLOW_USER_API_KEYS", "false").lower() == "true"

    # Expose which providers have server-configured API keys
    # (so the frontend can offer provider/model selection even without user keys)
    available: list[str] = []
    if orchestrator:
        cfg = orchestrator.config
        _provider_key_map = {
            'deepseek': cfg.deepseek_api_key,
            'openai':   cfg.openai_api_key,
            'claude':   cfg.anthropic_api_key,
            'gemini':   cfg.google_api_key,
            'qwen':     cfg.qwen_api_key,
        }
        available = [p for p, k in _provider_key_map.items() if k]

    return {
        "allow_user_api_keys": allow_user_keys,
        "available_providers": available,
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Translation LLM API is running",
        "orchestrator_ready": orchestrator is not None,
    }

@app.post("/api/session")
async def create_session(request: Request):
    """
    Create a short-lived session token bound to the client IP.
    No prior authentication required — rate limited by IP.
    """
    ip = _get_client_ip(request)
    token = _session_manager.create_session(ip)
    if token is None:
        raise HTTPException(status_code=429, detail="Session creation rate limit exceeded. Try again later.")
    return {
        "session_token": token,
        "expires_in": int(os.getenv("SESSION_TTL_SECONDS", "3600")),
        "daily_quota": _ip_quota.daily_limit,
        "quota_remaining": _ip_quota.get_remaining(ip),
    }


@app.get("/api/quota", dependencies=[Depends(_verify_auth_token)])
async def get_quota(request: Request):
    """Get remaining daily message quota for the calling IP."""
    ip = _get_client_ip(request)
    remaining = _ip_quota.get_remaining(ip)
    return {
        "daily_quota": _ip_quota.daily_limit,
        "remaining": remaining,
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
    translation_llm_provider: str = "auto"
    translation_llm_model: str = ""


def _resolve_llm_for_title(data: dict):
    """Resolve an LLM client for title generation using the translation LLM."""
    user_keys = {
        'deepseek': (data.get('deepseek_api_key') or '').strip(),
        'openai':   (data.get('openai_api_key') or '').strip(),
        'claude':   (data.get('anthropic_api_key') or '').strip(),
        'gemini':   (data.get('google_api_key') or '').strip(),
        'qwen':     (data.get('qwen_api_key') or '').strip(),
    }
    # Merge with server-configured keys (user keys take priority)
    server_keys: Dict[str, str] = {}
    if orchestrator:
        cfg = orchestrator.config
        server_keys = {
            'deepseek': cfg.deepseek_api_key or '',
            'openai':   cfg.openai_api_key or '',
            'claude':   cfg.anthropic_api_key or '',
            'gemini':   cfg.google_api_key or '',
            'qwen':     cfg.qwen_api_key or '',
        }
    keys = {p: user_keys[p] or server_keys.get(p, '') for p in user_keys}

    prov = data.get('translation_llm_provider', 'auto')
    if prov == 'auto':
        for p in ('deepseek', 'qwen', 'openai', 'claude', 'gemini'):
            if keys[p]:
                prov = p
                break
        else:
            prov = None
    if prov and keys.get(prov):
        model = (data.get('translation_llm_model') or '').strip() or _DEFAULT_MODELS.get(prov, '')
        extra = {}
        if prov == 'qwen':
            base_url = _validate_qwen_base_url(data.get('qwen_base_url'))
            if base_url:
                extra['base_url'] = base_url
        return LLMFactory.create_specific_llm(prov, keys[prov], model, **extra)
    if orchestrator:
        return orchestrator.translator.llm_client
    return None


@app.post("/api/generate-title", dependencies=[Depends(_verify_auth_token)])
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
    """Manages WebSocket connections with total and per-IP limits"""

    def __init__(self, max_total: int, max_per_ip: int):
        self.active_connections: list[WebSocket] = []
        self._ip_counts: Dict[str, int] = defaultdict(int)
        self._max_total = max_total
        self._max_per_ip = max_per_ip

    def _client_ip(self, websocket: WebSocket) -> str:
        return _get_client_ip(websocket)

    async def connect(self, websocket: WebSocket) -> bool:
        """Accept and track connection. Returns False if limits exceeded."""
        ip = self._client_ip(websocket)
        if len(self.active_connections) >= self._max_total:
            logger.warning(f"WS connection rejected: total limit ({self._max_total}) reached")
            await websocket.close(code=WS_1008_POLICY_VIOLATION)
            return False
        if self._ip_counts[ip] >= self._max_per_ip:
            logger.warning(f"WS connection rejected: per-IP limit ({self._max_per_ip}) for {ip}")
            await websocket.close(code=WS_1008_POLICY_VIOLATION)
            return False
        await websocket.accept()
        self.active_connections.append(websocket)
        self._ip_counts[ip] += 1
        return True

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            ip = self._client_ip(websocket)
            self._ip_counts[ip] = max(0, self._ip_counts[ip] - 1)
            if self._ip_counts[ip] == 0:
                del self._ip_counts[ip]

    async def send_message(
        self, websocket: WebSocket, message: StreamingMessage,
        cancelled: Optional[threading.Event] = None,
    ):
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception:
            # Connection is dead — signal producers to stop immediately
            if cancelled and not cancelled.is_set():
                cancelled.set()
                logger.info("WebSocket send failed, cancelling stream")
            self.disconnect(websocket)

manager = ConnectionManager(max_total=_MAX_CONNECTIONS, max_per_ip=_MAX_CONNECTIONS_PER_IP)

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    """WebSocket endpoint for streaming chat responses"""

    # --- Security: Validate Origin header to prevent Cross-Site WebSocket Hijacking ---
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    allowed = {o.rstrip("/") for o in _cors_origins}
    if origin and origin not in allowed:
        logger.warning(f"WebSocket connection rejected: origin {origin!r} not in allowed list")
        await websocket.close(code=WS_1008_POLICY_VIOLATION)
        return

    # --- Security: Validate auth token (static AUTH_TOKEN or dynamic session) ---
    if _AUTH_TOKEN:
        token = websocket.query_params.get("token", "")
        ip = manager._client_ip(websocket)
        # Accept static AUTH_TOKEN or valid session token
        token_ok = hmac.compare_digest(token, _AUTH_TOKEN) if token else False
        session_ok = _session_manager.validate_session(token, ip) if token else False
        if not token_ok and not session_ok:
            logger.warning("WebSocket connection rejected: invalid or missing auth token")
            await websocket.close(code=WS_1008_POLICY_VIOLATION)
            return

    if not await manager.connect(websocket):
        return  # limits exceeded, connection already closed

    # Per-connection rate limiter state
    _msg_timestamps: list[float] = []
    # Client IP for quota tracking
    _ws_client_ip = manager._client_ip(websocket)
    # Cancellation signal — set when connection closes to stop producer threads
    cancelled = threading.Event()

    # Active streaming task — tracked so "stop" messages can cancel it
    active_task: Optional[asyncio.Task] = None
    # Pending received data — buffered when messages arrive during streaming
    pending_data: Optional[str] = None

    async def _wait_for_stop_during_stream():
        """Listen for 'stop' messages while a streaming task is running."""
        nonlocal pending_data
        while active_task and not active_task.done():
            recv_task = asyncio.ensure_future(websocket.receive_text())
            done, _ = await asyncio.wait(
                [active_task, recv_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            if recv_task in done:
                data = recv_task.result()
                try:
                    parsed = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if parsed.get("type") == "stop":
                    cancelled.set()
                    # Wait for streaming task to finish after cancellation
                    try:
                        await active_task
                    except Exception:
                        pass
                    cancelled.clear()
                    await manager.send_message(websocket, StreamingMessage(
                        type="stopped",
                        step="cancelled",
                        content=""
                    ))
                    return
                else:
                    # Non-stop message during streaming — buffer it
                    pending_data = data
            if active_task in done:
                # Streaming completed naturally — cancel dangling recv if needed
                if not recv_task.done():
                    recv_task.cancel()
                    try:
                        await recv_task
                    except (asyncio.CancelledError, Exception):
                        pass
                return

    try:
        while True:
            # Use buffered data if available, otherwise receive new message
            if pending_data is not None:
                data = pending_data
                pending_data = None
            else:
                data = await websocket.receive_text()

            # --- Parse JSON ---
            try:
                request_data = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="validation",
                    content="Invalid JSON message"
                ))
                continue

            # Ignore stray stop messages when nothing is streaming
            if request_data.get("type") == "stop":
                continue

            # --- Rate limiting: sliding window per connection ---
            now = time.monotonic()
            _msg_timestamps = [t for t in _msg_timestamps if now - t < 1.0]
            if len(_msg_timestamps) >= _WS_RATE_LIMIT_PER_SEC:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="validation",
                    content="Rate limit exceeded. Please slow down."
                ))
                continue
            _msg_timestamps.append(now)

            # --- Daily quota check per IP ---
            allowed, remaining = _ip_quota.check_and_increment(_ws_client_ip)
            if not allowed:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="validation",
                    content=f"Daily message quota exceeded ({_ip_quota.daily_limit} messages/day). Please try again tomorrow.",
                    metadata={"quota_exceeded": True, "daily_limit": _ip_quota.daily_limit}
                ))
                continue

            # Reject oversized messages (100 KB limit)
            if len(data) > 100 * 1024:
                await manager.send_message(websocket, StreamingMessage(
                    type="error",
                    step="validation",
                    content="Message too large (max 100 KB)"
                ))
                continue

            # Launch streaming as a background task and listen for stop messages
            cancelled.clear()
            active_task = asyncio.create_task(
                process_streaming_chat(websocket, request_data, cancelled=cancelled)
            )
            await _wait_for_stop_during_stream()
            active_task = None

    except WebSocketDisconnect:
        cancelled.set()  # signal producer threads to stop immediately
        if active_task and not active_task.done():
            try:
                await active_task
            except Exception:
                pass
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        cancelled.set()
        if active_task and not active_task.done():
            try:
                await active_task
            except Exception:
                pass
        logger.error(f"WebSocket error: {type(e).__name__}")
        manager.disconnect(websocket)

# ── Think-tag streaming helpers ──────────────────────────────────────
# Some models (Qwen 3.x, DeepSeek-R1) emit <think>…</think> blocks.
# For translation we strip them; for inference we separate them.

async def _strip_think_tags(async_gen):
    """Async generator wrapper that silently strips <think>…</think> blocks."""
    in_think = False
    buf = ""
    async for token in async_gen:
        if in_think:
            buf += token
            idx = buf.find("</think>")
            if idx != -1:
                in_think = False
                remainder = buf[idx + 8:]
                buf = ""
                if remainder.lstrip():
                    yield remainder.lstrip()
            continue
        buf += token
        idx = buf.find("<think>")
        if idx != -1:
            before = buf[:idx]
            if before:
                yield before
            after = buf[idx + 7:]
            close = after.find("</think>")
            if close != -1:
                remainder = after[close + 8:]
                buf = ""
                if remainder.lstrip():
                    yield remainder.lstrip()
            else:
                in_think = True
                buf = after
        else:
            safe = buf[:-7] if len(buf) > 7 else ""
            buf = buf[len(safe):]
            if safe:
                yield safe
    if buf and not in_think:
        yield buf


# Sentinel tokens used to separate thinking from response in inference stream
_THINK_START = "\x00__THINK_START__\x00"
_THINK_END = "\x00__THINK_END__\x00"


async def _split_think_tags(async_gen):
    """
    Async generator wrapper that splits <think>…</think> blocks from response.
    Yields _THINK_START, thinking tokens, _THINK_END, then response tokens.
    """
    in_think = False
    buf = ""
    think_started = False
    async for token in async_gen:
        if in_think:
            buf += token
            idx = buf.find("</think>")
            if idx != -1:
                in_think = False
                thinking_tail = buf[:idx]
                if thinking_tail:
                    yield thinking_tail
                yield _THINK_END
                remainder = buf[idx + 8:]
                buf = ""
                if remainder.lstrip():
                    yield remainder.lstrip()
            else:
                # Yield thinking tokens as they come (don't buffer excessively)
                if len(buf) > 8:
                    safe = buf[:-8]
                    buf = buf[len(safe):]
                    yield safe
            continue
        buf += token
        idx = buf.find("<think>")
        if idx != -1:
            before = buf[:idx]
            if before:
                yield before
            if not think_started:
                yield _THINK_START
                think_started = True
            after = buf[idx + 7:]
            close = after.find("</think>")
            if close != -1:
                thinking_content = after[:close]
                if thinking_content:
                    yield thinking_content
                yield _THINK_END
                remainder = after[close + 8:]
                buf = ""
                if remainder.lstrip():
                    yield remainder.lstrip()
            else:
                in_think = True
                buf = after
        else:
            safe = buf[:-7] if len(buf) > 7 else ""
            buf = buf[len(safe):]
            if safe:
                yield safe
    if buf and not in_think:
        yield buf


async def _stream_translation(
    translator, text: str, source_language: str, target_language: str,
    cancelled: Optional[threading.Event] = None,
    context_hint: str = "",
    user_query: str = "",
):
    """
    Async generator that wraps the synchronous LLM streaming translation generator.

    Runs the blocking sync generator in a thread pool and forwards each
    token to the async caller via an asyncio.Queue.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=_STREAM_QUEUE_MAXSIZE)

    def _producer():
        try:
            for token in translator.stream_translate(
                text, source_language, target_language,
                context_hint=context_hint, user_query=user_query,
            ):
                if cancelled and cancelled.is_set():
                    break
                asyncio.run_coroutine_threadsafe(queue.put(token), loop).result()
        except Exception as exc:
            if not (cancelled and cancelled.is_set()):
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
    cancelled: Optional[threading.Event] = None,
    **kwargs,
):
    """
    Async generator that wraps the synchronous LLM streaming generator.

    Runs the blocking sync generator in a thread pool and forwards each
    token to the async caller via an asyncio.Queue, so the event loop is
    never blocked.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=_STREAM_QUEUE_MAXSIZE)

    def _producer():
        try:
            for token in questioner.stream_generate_response(
                prompt, response_type=response_type,
                conversation_history=conversation_history,
                system_prompt_override=system_prompt_override,
                **kwargs
            ):
                if cancelled and cancelled.is_set():
                    break
                asyncio.run_coroutine_threadsafe(queue.put(token), loop).result()
        except Exception as exc:
            if not (cancelled and cancelled.is_set()):
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


async def _stream_routing(
    router: PromptRouter, user_message: str, processing_language: str,
    cancelled: Optional[threading.Event] = None,
):
    """
    Async generator that streams routing output token by token.
    The LLM outputs [Template Label] on the first line, followed by the system prompt.
    Uses the same thread-pool + queue pattern as _stream_inference.
    """
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue(maxsize=_STREAM_QUEUE_MAXSIZE)

    def _producer():
        try:
            for token in router.route_stream(user_message, processing_language):
                if cancelled and cancelled.is_set():
                    break
                asyncio.run_coroutine_threadsafe(queue.put(token), loop).result()
        except Exception as exc:
            if not (cancelled and cancelled.is_set()):
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
    qwen_base_url = _validate_qwen_base_url(request_data.get('qwen_base_url'))

    main_prov   = request_data.get('main_llm_provider',        'auto')
    trans_prov  = request_data.get('translation_llm_provider', 'auto')
    main_model  = (request_data.get('main_llm_model')          or '').strip()
    trans_model = (request_data.get('translation_llm_model')   or '').strip()

    # Key lookup by provider — user-supplied keys first, fall back to server keys
    _user_key_map: Dict[str, str] = {
        'deepseek': deepseek_key,
        'openai':   openai_key,
        'claude':   anthropic_key,
        'gemini':   google_key,
        'qwen':     qwen_key,
    }
    # Merge with server-configured keys (user keys take priority)
    _server_key_map: Dict[str, str] = {}
    if orchestrator:
        cfg = orchestrator.config
        _server_key_map = {
            'deepseek': cfg.deepseek_api_key or '',
            'openai':   cfg.openai_api_key or '',
            'claude':   cfg.anthropic_api_key or '',
            'gemini':   cfg.google_api_key or '',
            'qwen':     cfg.qwen_api_key or '',
        }
    _key_map: Dict[str, str] = {
        p: _user_key_map[p] or _server_key_map.get(p, '')
        for p in _user_key_map
    }

    # ── Auto-resolution priority (shared by both roles) ─────────────
    _AUTO_PRIORITY = ('deepseek', 'qwen', 'openai', 'claude', 'gemini')

    # ── Resolve main (questioner) provider ─────────────────────────
    if main_prov == 'auto':
        for p in _AUTO_PRIORITY:
            if _key_map[p]:
                main_prov = p
                break
        else:
            main_prov = None

    # ── Resolve translation provider ───────────────────────────────
    if trans_prov == 'auto':
        for p in _AUTO_PRIORITY:
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


async def process_streaming_chat(
    websocket: WebSocket, request_data: Dict[str, Any],
    cancelled: Optional[threading.Event] = None,
):
    """Process chat request with streaming updates"""

    async def _send(msg: StreamingMessage):
        """Send message with cancellation awareness."""
        await manager.send_message(websocket, msg, cancelled=cancelled)

    message = request_data.get("message", "")
    source_language = request_data.get("source_language", "english")
    target_language = request_data.get("target_language", "english")
    processing_language = request_data.get("processing_language", "english")
    response_type = request_data.get("response_type", "general")
    translation_method = request_data.get("translation_method", "google")
    conversation_history = request_data.get("conversation_history", [])

    # --- Input validation ---
    _valid_languages = set(LanguageConfig.get_supported_languages())
    _valid_response_types = {"general", "creative", "analytical", "educational", "technical"}
    _valid_translation_methods = {"llm", "google"}

    for lang_name, lang_val in [
        ("source_language", source_language),
        ("target_language", target_language),
        ("processing_language", processing_language),
    ]:
        if lang_val not in _valid_languages:
            await _send(StreamingMessage(
                type="error", step="validation",
                content=f"Unsupported {lang_name}: must be one of {sorted(_valid_languages)}"
            ))
            return

    if response_type not in _valid_response_types:
        response_type = "general"
    if translation_method not in _valid_translation_methods:
        translation_method = "google"

    # Limit message length (10,000 chars max)
    if len(message) > 10_000:
        await _send(StreamingMessage(
            type="error", step="validation",
            content="Message too long (max 10,000 characters)"
        ))
        return

    # Validate and sanitize conversation history
    max_turns = int(os.getenv("MAX_HISTORY_TURNS", "20"))
    max_messages = max_turns * 2
    _valid_roles = {"user", "assistant"}
    sanitized_history = []
    for entry in conversation_history[-max_messages:]:
        if (
            isinstance(entry, dict)
            and entry.get("role") in _valid_roles
            and isinstance(entry.get("content"), str)
            and len(entry["content"]) <= 20_000
        ):
            sanitized_history.append({"role": entry["role"], "content": entry["content"]})
    conversation_history = sanitized_history

    try:
        translator, questioner = _resolve_agents(request_data)
    except ValueError:
        await _send(StreamingMessage(
            type="error", step="initialization",
            content="No API key available. Please configure an API key in settings."
        ))
        return

    try:
        # Step 0: Prompt Routing (optional) ────────────────────────────────
        # Runs BEFORE translation on the original user message so the router
        # sees the natural phrasing.  The generated system prompt is written
        # in the processing language.
        routed_system_prompt: Optional[str] = None
        prompt_translation_task: Optional[asyncio.Task] = None
        router = _resolve_router(request_data, translator)
        if router is not None:
            await _send(StreamingMessage(
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
                async for token in _stream_routing(router, message, processing_language, cancelled=cancelled):
                    if not header_parsed:
                        header_buffer += token
                        if "\n" in header_buffer:
                            header_line, _, remainder = header_buffer.partition("\n")
                            m = re.match(r"\[(.+?)\]", header_line.strip())
                            routing_label = m.group(1) if m else "General Assistant"
                            header_parsed = True
                            await _send(StreamingMessage(
                                type="prompt_routing_label",
                                step="routing",
                                content=routing_label,
                                metadata={"template_label": routing_label}
                            ))
                            remainder = remainder.lstrip("\n")
                            if remainder:
                                routed_system_prompt += remainder
                                await _send(StreamingMessage(
                                    type="prompt_routing_chunk",
                                    step="routing",
                                    content=remainder,
                                    metadata={}
                                ))
                    else:
                        routed_system_prompt += token
                        await _send(StreamingMessage(
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
                    await _send(StreamingMessage(
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

            await _send(StreamingMessage(
                type="prompt_routing_complete",
                step="routing",
                content=routed_system_prompt or "",
                metadata={"template_label": routing_label}
            ))

            # Translate the system prompt to source language for the left column.
            # Launch as a background task so input translation can start in parallel.
            async def _translate_routed_prompt() -> None:
                try:
                    if translation_method == 'llm':
                        async for tok in _strip_think_tags(_stream_translation(
                            translator, routed_system_prompt,
                            processing_language, source_language,
                            cancelled=cancelled,
                            context_hint="system prompt / instructions",
                        )):
                            await _send(StreamingMessage(
                                type="prompt_routing_translation_chunk",
                                step="routing",
                                content=tok,
                                metadata={}
                            ))
                    else:
                        translated_prompt = await asyncio.to_thread(
                            translator.translate,
                            routed_system_prompt, processing_language, source_language, 'google'
                        )
                        await _send(StreamingMessage(
                            type="prompt_routing_translation_chunk",
                            step="routing",
                            content=translated_prompt,
                            metadata={}
                        ))
                    await _send(StreamingMessage(
                        type="prompt_routing_translation_complete",
                        step="routing",
                        content="",
                        metadata={}
                    ))
                except Exception as _te:
                    logger.warning(f"System prompt translation failed: {_te}")
                    await _send(StreamingMessage(
                        type="prompt_routing_translation_complete",
                        step="routing",
                        content="",
                        metadata={}
                    ))

            if routed_system_prompt and source_language != processing_language:
                prompt_translation_task = asyncio.create_task(_translate_routed_prompt())
            elif routed_system_prompt:
                # Same language — mirror directly (instant, no need for a task)
                await _send(StreamingMessage(
                    type="prompt_routing_translation_chunk",
                    step="routing",
                    content=routed_system_prompt,
                    metadata={}
                ))
                await _send(StreamingMessage(
                    type="prompt_routing_translation_complete",
                    step="routing",
                    content="",
                    metadata={}
                ))

        # Step 1: Input translation (if needed) ───────────────────────────
        if source_language != processing_language:
            await _send(StreamingMessage(
                type="translation_start",
                step="input_translation",
                content=f"Translating from {source_language} to {processing_language}...",
                metadata={"from": source_language, "to": processing_language}
            ))

            if translation_method == 'llm':
                # LLM translation — stream tokens to the frontend in real time
                processed_input = ""
                async for token in _strip_think_tags(_stream_translation(
                    translator, message, source_language, processing_language,
                    cancelled=cancelled,
                )):
                    processed_input += token
                    await _send(StreamingMessage(
                        type="input_translation_chunk",
                        step="input_translation",
                        content=token,
                        metadata={"is_final": False}
                    ))
                await _send(StreamingMessage(
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
                    await _send(StreamingMessage(
                        type="translation_complete",
                        step="input_translation",
                        content=processed_input,
                        metadata={"original": message, "translated": processed_input}
                    ))
                else:
                    raise Exception(f"Translation failed: {translation_result.get('error', 'Unknown error')}")
        else:
            processed_input = message
            await _send(StreamingMessage(
                type="translation_complete",
                step="input_translation",
                content=processed_input,
                metadata={"original": message, "translated": processed_input, "skipped": True}
            ))

        # Ensure system prompt translation finishes before inference starts
        if prompt_translation_task is not None:
            await prompt_translation_task
            prompt_translation_task = None

        # Step 2 + 3: Streaming inference with concurrent paragraph-chunked translation
        await _send(StreamingMessage(
            type="processing_start",
            step="inference",
            content="Generating response...",
            metadata={"processing_language": processing_language}
        ))

        needs_translation = processing_language != target_language
        processed_response = ""

        if not needs_translation:
            # No translation needed — simple streaming loop (with think-tag separation)
            # Mirror thinking to left column as-is (same language)
            in_thinking = False
            raw_inference = _stream_inference(
                questioner, processed_input, response_type,
                conversation_history=conversation_history or None,
                system_prompt_override=routed_system_prompt,
                cancelled=cancelled,
            )
            async for token in _split_think_tags(raw_inference):
                if token == _THINK_START:
                    in_thinking = True
                    await _send(StreamingMessage(
                        type="thinking_start", step="inference", content=""
                    ))
                    await _send(StreamingMessage(
                        type="thinking_translation_start", step="output_translation", content=""
                    ))
                    continue
                if token == _THINK_END:
                    in_thinking = False
                    await _send(StreamingMessage(
                        type="thinking_complete", step="inference", content=""
                    ))
                    await _send(StreamingMessage(
                        type="thinking_translation_complete", step="output_translation", content=""
                    ))
                    continue
                if in_thinking:
                    await _send(StreamingMessage(
                        type="thinking_chunk", step="inference",
                        content=token, metadata={"is_final": False}
                    ))
                    await _send(StreamingMessage(
                        type="thinking_translation_chunk", step="output_translation",
                        content=token, metadata={"is_final": False}
                    ))
                else:
                    processed_response += token
                    await _send(StreamingMessage(
                        type="processing_chunk", step="inference",
                        content=token, metadata={"is_final": False}
                    ))

            await _send(StreamingMessage(
                type="processing_complete", step="inference",
                content=processed_response,
                metadata={"processing_language": processing_language}
            ))

            final_response = processed_response
            await _send(StreamingMessage(
                type="final_translation", step="output_translation",
                content=final_response,
                metadata={"original": processed_response, "translated": final_response, "skipped": True}
            ))
        else:
            # Concurrent pipeline: inference produces paragraph chunks,
            # each chunk is translated in parallel, output is streamed in order.
            #
            # Architecture:
            #   Inference → ParagraphBuffer → chunk ready → start translation task immediately
            #   Each task buffers tokens into its own asyncio.Queue
            #   Output consumer drains chunk queues IN ORDER → WebSocket
            #
            # Result: chunk N+1 can translate while chunk N is still streaming
            # to the frontend, but the user always sees output in correct order.

            para_buf = ParagraphBuffer()
            translated_parts: list[str] = []
            pipeline_error: list[Exception] = []

            # Ordered list of per-chunk token queues; None sentinel = chunk done
            chunk_token_queues: list[asyncio.Queue[Optional[str]]] = []
            # Event signalling that all chunks have been submitted
            all_chunks_submitted = asyncio.Event()

            # The user's original question in the source (target) language,
            # used as reference for proper nouns / names during back-translation.
            _user_query_ref = message if target_language != processing_language else ""

            async def _translate_chunk_task(
                chunk: str,
                token_queue: asyncio.Queue[Optional[str]],
                context_hint: str,
            ):
                """Translate a single chunk, pushing tokens into its queue."""
                try:
                    trailing_sep = "\n\n" if chunk.endswith("\n\n") else ""
                    if translation_method == 'llm':
                        chunk_translated = ""
                        async for tok in _strip_think_tags(_stream_translation(
                            translator, chunk,
                            processing_language, target_language,
                            cancelled=cancelled,
                            context_hint=context_hint,
                            user_query=_user_query_ref,
                        )):
                            chunk_translated += tok
                            await token_queue.put(tok)
                        # Restore paragraph break if LLM stripped it
                        if trailing_sep and not chunk_translated.endswith("\n\n"):
                            await token_queue.put(trailing_sep)
                    else:
                        # Google translate — batch
                        translated_chunk = await asyncio.to_thread(
                            translator.translate,
                            chunk, processing_language, target_language, 'google'
                        )
                        if trailing_sep and not translated_chunk.endswith("\n\n"):
                            translated_chunk += trailing_sep
                        await token_queue.put(translated_chunk)
                except Exception as exc:
                    await token_queue.put(exc)
                finally:
                    await token_queue.put(None)  # sentinel: this chunk is done

            # Track all flushed source chunks for building context hints
            _source_chunks_so_far: list[str] = []

            def _submit_chunk(chunk: str):
                """Start a parallel translation task for a chunk."""
                # Use previously flushed source text (not translated text) as context,
                # since translations may still be in-flight due to parallelism.
                context_hint = "".join(_source_chunks_so_far)[-300:] if _source_chunks_so_far else ""
                _source_chunks_so_far.append(chunk)
                q: asyncio.Queue[Optional[str]] = asyncio.Queue()
                chunk_token_queues.append(q)
                asyncio.create_task(_translate_chunk_task(chunk, q, context_hint))

            async def _ordered_output_consumer():
                """Stream translated tokens to the frontend in chunk order."""
                try:
                    # Wait for thinking translation to finish before showing response
                    await think_translation_done.wait()
                    idx = 0
                    while True:
                        # Wait for the next chunk queue to appear
                        while idx >= len(chunk_token_queues):
                            if all_chunks_submitted.is_set() and idx >= len(chunk_token_queues):
                                return  # no more chunks
                            await asyncio.sleep(0.02)
                        q = chunk_token_queues[idx]
                        chunk_result = ""
                        while True:
                            item = await q.get()
                            if item is None:
                                break  # chunk complete
                            if isinstance(item, Exception):
                                raise item
                            chunk_result += item
                            await _send(StreamingMessage(
                                type="output_translation_chunk",
                                step="output_translation",
                                content=item,
                                metadata={"is_final": False}
                            ))
                        translated_parts.append(chunk_result)
                        idx += 1
                except Exception as exc:
                    pipeline_error.append(exc)

            # Start ordered output consumer
            output_task = asyncio.create_task(_ordered_output_consumer())

            # ── Thinking translation pipeline (same chunked pattern as main response) ──
            think_para_buf = ParagraphBuffer()
            think_chunk_queues: list[asyncio.Queue[Optional[str]]] = []
            think_all_submitted = asyncio.Event()
            think_translation_done = asyncio.Event()   # gates output consumer
            think_pipeline_error: list[Exception] = []
            think_source_chunks: list[str] = []
            thinking_started = False

            async def _translate_think_chunk(
                chunk: str,
                token_queue: asyncio.Queue[Optional[str]],
                context_hint: str,
            ):
                """Translate a single thinking chunk, pushing tokens into its queue."""
                try:
                    trailing_sep = "\n\n" if chunk.endswith("\n\n") else ""
                    if translation_method == 'llm':
                        chunk_translated = ""
                        async for tok in _strip_think_tags(_stream_translation(
                            translator, chunk,
                            processing_language, target_language,
                            cancelled=cancelled,
                            context_hint=context_hint,
                            user_query=_user_query_ref,
                        )):
                            chunk_translated += tok
                            await token_queue.put(tok)
                        if trailing_sep and not chunk_translated.endswith("\n\n"):
                            await token_queue.put(trailing_sep)
                    else:
                        translated_chunk = await asyncio.to_thread(
                            translator.translate,
                            chunk, processing_language, target_language, 'google'
                        )
                        if trailing_sep and not translated_chunk.endswith("\n\n"):
                            translated_chunk += trailing_sep
                        await token_queue.put(translated_chunk)
                except Exception as exc:
                    await token_queue.put(exc)
                finally:
                    await token_queue.put(None)

            def _submit_think_chunk(chunk: str):
                context_hint = "".join(think_source_chunks)[-300:] if think_source_chunks else ""
                think_source_chunks.append(chunk)
                q: asyncio.Queue[Optional[str]] = asyncio.Queue()
                think_chunk_queues.append(q)
                asyncio.create_task(_translate_think_chunk(chunk, q, context_hint))

            async def _think_output_consumer():
                """Stream translated thinking tokens to the frontend in chunk order.
                Sets think_translation_done when finished so the response output
                consumer can start immediately — no need to wait for inference to end."""
                try:
                    idx = 0
                    while True:
                        while idx >= len(think_chunk_queues):
                            if think_all_submitted.is_set() and idx >= len(think_chunk_queues):
                                return
                            await asyncio.sleep(0.02)
                        q = think_chunk_queues[idx]
                        while True:
                            item = await q.get()
                            if item is None:
                                break
                            if isinstance(item, Exception):
                                raise item
                            await _send(StreamingMessage(
                                type="thinking_translation_chunk",
                                step="output_translation",
                                content=item,
                                metadata={"is_final": False}
                            ))
                        idx += 1
                except Exception as exc:
                    think_pipeline_error.append(exc)
                finally:
                    await _send(StreamingMessage(
                        type="thinking_translation_complete",
                        step="output_translation", content=""
                    ))
                    think_translation_done.set()

            think_output_task: Optional[asyncio.Task] = None

            # Producer: inference loop — stream to right column + feed paragraph buffer
            # Think-tag separation: thinking tokens are sent separately, not fed to translation
            in_thinking = False
            raw_inference = _stream_inference(
                questioner, processed_input, response_type,
                conversation_history=conversation_history or None,
                system_prompt_override=routed_system_prompt,
                cancelled=cancelled,
            )
            async for token in _split_think_tags(raw_inference):
                if token == _THINK_START:
                    in_thinking = True
                    thinking_started = True
                    await _send(StreamingMessage(
                        type="thinking_start", step="inference", content=""
                    ))
                    await _send(StreamingMessage(
                        type="thinking_translation_start", step="output_translation", content=""
                    ))
                    think_output_task = asyncio.create_task(_think_output_consumer())
                    continue
                if token == _THINK_END:
                    in_thinking = False
                    await _send(StreamingMessage(
                        type="thinking_complete", step="inference", content=""
                    ))
                    # Flush remaining thinking buffer
                    remaining_think = think_para_buf.flush()
                    if remaining_think is not None:
                        _submit_think_chunk(remaining_think)
                    think_all_submitted.set()
                    continue
                if in_thinking:
                    await _send(StreamingMessage(
                        type="thinking_chunk", step="inference",
                        content=token, metadata={"is_final": False}
                    ))
                    # Feed thinking paragraph buffer — translate as chunks accumulate
                    flushed_think = think_para_buf.feed(token)
                    if flushed_think is not None:
                        _submit_think_chunk(flushed_think)
                else:
                    # No thinking at all — unblock output consumer immediately
                    if not thinking_started and not think_translation_done.is_set():
                        think_translation_done.set()
                    processed_response += token
                    await _send(StreamingMessage(
                        type="processing_chunk", step="inference",
                        content=token, metadata={"is_final": False}
                    ))
                    flushed = para_buf.feed(token)
                    if flushed is not None:
                        _submit_chunk(flushed)

            await _send(StreamingMessage(
                type="processing_complete", step="inference",
                content=processed_response,
                metadata={"processing_language": processing_language}
            ))

            # Flush remaining response buffer
            remaining = para_buf.flush()
            if remaining is not None:
                _submit_chunk(remaining)
            all_chunks_submitted.set()

            # Ensure think_translation_done is set for non-thinking models
            # (thinking models set it inside _think_output_consumer)
            if not think_translation_done.is_set():
                think_translation_done.set()

            # Wait for all response output to be streamed
            await output_task

            # Wait for thinking translation task to fully finish (cleanup)
            if think_output_task:
                if not think_all_submitted.is_set():
                    think_all_submitted.set()
                await think_output_task
                if think_pipeline_error:
                    logger.warning(f"Thinking translation error: {think_pipeline_error[0]}")
            if pipeline_error:
                raise pipeline_error[0]

            final_response = "".join(translated_parts)
            await _send(StreamingMessage(
                type="final_translation", step="output_translation",
                content=final_response,
                metadata={"original": processed_response, "translated": final_response}
            ))

    except Exception as e:
        logger.error(f"Processing error: {type(e).__name__}: {e}")
        await _send(StreamingMessage(
            type="error",
            step="processing",
            content=_sanitize_error(e)
        ))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
