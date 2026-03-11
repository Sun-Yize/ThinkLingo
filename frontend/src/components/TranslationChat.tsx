import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConversationTurn, WebSocketMessage, Language, ResponseType, ChatSettings, ConversationMeta, SavedConversation } from '../types/chat';
import { getT } from '../utils/i18n';
import DualColumnView from './DualColumnView';
import SettingsModal from './SettingsModal';
import ApiConfigModal from './ApiConfigModal';
import ChatHistory from './ChatHistory';
import InputBar from './InputBar';

const NATIVE_NAMES: Record<string, string> = {
  english:  'English',
  chinese:  '中文',
  japanese: '日本語',
  korean:   '한국어',
};

// Optional static auth token — set via REACT_APP_AUTH_TOKEN env var at build time.
// Prefer dynamic session tokens obtained from POST /api/session.
const STATIC_AUTH_TOKEN = process.env.REACT_APP_AUTH_TOKEN || '';

// Mutable session token — acquired at runtime, not embedded in the bundle.
let _sessionToken: string = '';

const _authHeaders = (): Record<string, string> => {
  const token = _sessionToken || STATIC_AUTH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const _getWsToken = (): string => _sessionToken || STATIC_AUTH_TOKEN;

// Daily quota limit — set from /api/session response

const MAX_CONVERSATIONS = 50;
const STORAGE_INDEX_KEY = 'thinklingo_conv_index';
const STORAGE_CONV_PREFIX = 'thinklingo_conv_';

const DEFAULT_SETTINGS: ChatSettings = {
  sourceLanguage:          'chinese',
  processingLanguage:      'english',
  responseType:            'general',
  translationMethod:       'llm',
  enablePromptRouting:     false,
  apiKeys:                 { deepseek: '', openai: '', anthropic: '', google: '', qwen: '' },
  mainLlm:                 { provider: 'auto', model: '' },
  translationLlm:          { provider: 'auto', model: '' },
  qwenRegion:              'cn',
};

interface StreamContext {
  convId: string;
  rightUserAccumulator: string;
  rightAiAccumulator: string;
  rightAiThinkingAccumulator: string;
  leftAiThinkingAccumulator: string;
  leftAiAccumulator: string;
  refinedPromptAccumulator: string;
  leftRefinedPromptAccumulator: string;
  pendingEnglishInput: string;
  // null = foreground (React state is source of truth)
  // non-null = background snapshot
  turns: ConversationTurn[] | null;
  history: Array<{ role: 'user' | 'assistant'; content: string }> | null;
}

const SETTINGS_KEY = 'thinklingo_settings';
const API_KEYS_SESSION_KEY = 'thinklingo_api_keys';

function loadSettings(): ChatSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    const base = stored ? JSON.parse(stored) : {};

    // API keys live in sessionStorage (cleared on tab close) for security.
    // Migrate: if keys still exist in localStorage, move them to sessionStorage once.
    let apiKeys = DEFAULT_SETTINGS.apiKeys;
    try {
      const sessionKeys = sessionStorage.getItem(API_KEYS_SESSION_KEY);
      if (sessionKeys) {
        apiKeys = { ...apiKeys, ...JSON.parse(sessionKeys) };
      } else if (base.apiKeys) {
        // One-time migration from localStorage → sessionStorage
        apiKeys = { ...apiKeys, ...base.apiKeys };
        sessionStorage.setItem(API_KEYS_SESSION_KEY, JSON.stringify(apiKeys));
        // Remove migrated keys from localStorage
        const { apiKeys: _, ...cleanBase } = base;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanBase));
      }
    } catch { /* ignore */ }

    return {
      ...DEFAULT_SETTINGS,
      ...base,
      apiKeys,
      mainLlm:        { ...DEFAULT_SETTINGS.mainLlm,        ...(base.mainLlm        ?? {}) },
      translationLlm: { ...DEFAULT_SETTINGS.translationLlm, ...(base.translationLlm ?? {}) },
    };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

// ── localStorage helpers for conversations ──────────────────────────

function loadConvIndex(): ConversationMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveConvIndex(index: ConversationMeta[]) {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function loadConvData(id: string): SavedConversation | null {
  try {
    const raw = localStorage.getItem(STORAGE_CONV_PREFIX + id);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveConvData(conv: SavedConversation) {
  localStorage.setItem(STORAGE_CONV_PREFIX + conv.id, JSON.stringify(conv));
}

function deleteConvData(id: string) {
  localStorage.removeItem(STORAGE_CONV_PREFIX + id);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────

const TranslationChat: React.FC = () => {
  const [turns, setTurns]               = useState<ConversationTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scrollTrigger, setScrollTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [apiConfigOpen, setApiConfigOpen]   = useState(false);
  const [historyOpen, setHistoryOpen]       = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [settings, setSettings]         = useState<ChatSettings>(loadSettings);
  const [languages, setLanguages]       = useState<Language[]>([]);
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>([]);
  const [allowUserApiKeys, setAllowUserApiKeys] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // Conversation management
  const [convIndex, setConvIndex]   = useState<ConversationMeta[]>(loadConvIndex);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const wsRef              = useRef<WebSocket | null>(null);
  const isMountedRef       = useRef(true);
  const handleWsMessageRef = useRef<(msg: WebSocketMessage) => void>(() => {});

  const conversationHistoryRef  = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // ── Stream queue ────────────────────────────────────────────────
  // Each entry owns accumulators + optional background snapshots.
  // The backend processes requests serially, so tokens arrive FIFO.
  const streamQueueRef = useRef<StreamContext[]>([]);

  // Refs to latest state for use in save callback
  const turnsRef    = useRef(turns);
  const convIdRef   = useRef(activeConvId);
  const convIndexRef = useRef(convIndex);
  turnsRef.current    = turns;
  convIdRef.current   = activeConvId;
  convIndexRef.current = convIndex;

  useEffect(() => {
    handleWsMessageRef.current = handleWebSocketMessage;
  });

  useEffect(() => {
    // Acquire a dynamic session token before connecting
    const init = async () => {
      try {
        const res = await fetch('/api/session', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          _sessionToken = data.session_token;
        }
      } catch {
        // Fall back to static AUTH_TOKEN if session endpoint unavailable
      }

      loadLanguages();
      loadResponseTypes();
      loadAppConfig();
      connectWebSocket();

      // Load the most recent conversation if one exists
      const index = loadConvIndex();
      if (index.length > 0) {
        loadConversation(index[0].id);
      }
    };
    init();

    // Refresh session token periodically (every 50 minutes for 1h TTL)
    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/session', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          _sessionToken = data.session_token;
          // Reconnect WebSocket with new token
          wsRef.current?.close();
        }
      } catch { /* keep existing token */ }
    }, 50 * 60 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Save non-sensitive settings to localStorage (persists across sessions)
    const { apiKeys, ...safeSettings } = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
    // Save API keys to sessionStorage only (cleared when tab closes)
    sessionStorage.setItem(API_KEYS_SESSION_KEY, JSON.stringify(apiKeys));
  }, [settings]);

  // Persist conversation index whenever it changes
  useEffect(() => {
    saveConvIndex(convIndex);
  }, [convIndex]);


  // ── Save current conversation data when turns or history change ────
  const saveCurrentConversation = useCallback(() => {
    const id = convIdRef.current;
    if (!id) return;
    // Only save turns that are complete or errored (skip mid-stream)
    saveConvData({
      id,
      turns: turnsRef.current,
      history: conversationHistoryRef.current,
    });
  }, []);

  // Save on turns change (debounced slightly — fires after streaming completes)
  useEffect(() => {
    if (!activeConvId) return;
    const timer = setTimeout(saveCurrentConversation, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, activeConvId]);

  // ── Conversation CRUD ─────────────────────────────────────────────

  const loadConversation = (id: string) => {
    const data = loadConvData(id);
    if (data) {
      setTurns(data.turns);
      conversationHistoryRef.current = data.history;
    } else {
      setTurns([]);
      conversationHistoryRef.current = [];
    }
    setActiveConvId(id);
  };

  const snapshotActiveStreams = () => {
    // Move any foreground streams for the current conv to background
    const curId = convIdRef.current;
    for (const ctx of streamQueueRef.current) {
      if (ctx.convId === curId && ctx.turns === null) {
        ctx.turns = [...turnsRef.current];
        ctx.history = [...conversationHistoryRef.current];
      }
    }
  };

  const createNewConversation = () => {
    const hasActiveStream = streamQueueRef.current.some(
      ctx => ctx.convId === activeConvId
    );
    if (hasActiveStream) {
      snapshotActiveStreams();
    } else {
      saveCurrentConversation();
    }

    const id = generateId();
    const now = Date.now();
    const meta: ConversationMeta = {
      id,
      title: '',
      createdAt: now,
      updatedAt: now,
    };

    setConvIndex(prev => [meta, ...prev].slice(0, MAX_CONVERSATIONS));
    setTurns([]);
    conversationHistoryRef.current = [];
    setActiveConvId(id);
    setIsProcessing(false);
  };

  const switchConversation = (id: string) => {
    if (id === activeConvId) return;

    // Snapshot any foreground streams for the conv we're leaving
    const hasActiveStream = streamQueueRef.current.some(
      ctx => ctx.convId === activeConvId
    );
    if (hasActiveStream) {
      snapshotActiveStreams();
    } else {
      saveCurrentConversation();
    }

    // Check if the target conv has a background stream we can restore
    const targetStream = streamQueueRef.current.find(
      ctx => ctx.convId === id && ctx.turns !== null
    );
    if (targetStream) {
      // Promote background stream back to foreground
      setTurns(targetStream.turns!);
      conversationHistoryRef.current = targetStream.history ?? [];
      targetStream.turns = null;
      targetStream.history = null;
      setActiveConvId(id);
      // Processing if the queue head is this conv
      const head = getActiveStream();
      setIsProcessing(head !== null && head.convId === id);
    } else {
      loadConversation(id);
      setIsProcessing(false);
    }
  };

  const deleteConversation = (id: string) => {
    // Remove any queued streams for this conv (tokens will be silently discarded)
    streamQueueRef.current = streamQueueRef.current.filter(ctx => ctx.convId !== id);
    deleteConvData(id);
    setConvIndex(prev => prev.filter(c => c.id !== id));
    if (id === activeConvId) {
      // Switch to next conversation or create new
      const remaining = convIndexRef.current.filter(c => c.id !== id);
      if (remaining.length > 0) {
        loadConversation(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  // ── Update conversation title (move to top + set timestamp) ─────
  const touchConvTimestamp = () => {
    const id = convIdRef.current;
    if (!id) return;
    setConvIndex(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], updatedAt: Date.now() };
      const rest = prev.filter((_, i) => i !== idx);
      return [updated, ...rest];
    });
  };

  // ── LLM-generated conversation title ──────────────────────────────
  const generateConvTitle = async (message: string, response: string, language?: string, overrideId?: string) => {
    const id = overrideId ?? convIdRef.current;
    if (!id) return;
    // Only generate title for the first turn
    const conv = convIndexRef.current.find(c => c.id === id);
    if (conv?.title) return;

    try {
      const res = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders() },
        body: JSON.stringify({
          message: message,
          response: response,
          language: language,
          deepseek_api_key:   settings.apiKeys.deepseek,
          openai_api_key:     settings.apiKeys.openai,
          anthropic_api_key:  settings.apiKeys.anthropic,
          google_api_key:     settings.apiKeys.google,
          qwen_api_key:       settings.apiKeys.qwen,
          qwen_base_url:      settings.qwenRegion === 'cn'
            ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
            : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
          translation_llm_provider:  settings.translationLlm.provider,
          translation_llm_model:     settings.translationLlm.model,
        }),
      });
      const data = await res.json();
      if (data.title) {
        setConvIndex(prev => {
          const idx = prev.findIndex(c => c.id === id);
          if (idx === -1 || prev[idx].title) return prev;
          const updated = { ...prev[idx], title: data.title, updatedAt: Date.now() };
          const rest = prev.filter((_, i) => i !== idx);
          return [updated, ...rest];
        });
      }
    } catch {
      // Fallback: use truncated message as title
      setConvIndex(prev => {
        const idx = prev.findIndex(c => c.id === id);
        if (idx === -1 || prev[idx].title) return prev;
        const title = message.slice(0, 40) + (message.length > 40 ? '…' : '');
        const updated = { ...prev[idx], title, updatedAt: Date.now() };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    }
  };

  // ── API / WS setup (unchanged) ────────────────────────────────────

  const loadLanguages = async () => {
    try {
      const res  = await fetch('/api/languages', { headers: _authHeaders() });
      const data = await res.json();
      setLanguages(data.map((l: any) => ({
        key:         l.key,
        name:        l.display_name,
        native_name: NATIVE_NAMES[l.key] ?? l.display_name,
        code:        l.code,
      })));
    } catch {
      setLanguages(
        Object.entries(NATIVE_NAMES).map(([key, native]) => ({
          key,
          name:        key.charAt(0).toUpperCase() + key.slice(1),
          native_name: native,
        }))
      );
    }
  };

  const loadResponseTypes = async () => {
    try {
      const res  = await fetch('/api/response-types', { headers: _authHeaders() });
      const data = await res.json();
      setResponseTypes(
        Object.entries(data).map(([key, description]) => ({ key, description: description as string }))
      );
    } catch {
      setResponseTypes([
        { key: 'general',     description: 'General purpose' },
        { key: 'creative',    description: 'Creative' },
        { key: 'analytical',  description: 'Analytical' },
        { key: 'educational', description: 'Educational' },
        { key: 'technical',   description: 'Technical' },
      ]);
    }
  };

  const loadAppConfig = async () => {
    try {
      const res  = await fetch('/api/config', { headers: _authHeaders() });
      const data = await res.json();
      setAllowUserApiKeys(!!data.allow_user_api_keys);
      setAvailableProviders(data.available_providers ?? []);
    } catch {
      // leave false — fail-safe default
    }
  };

  const connectWebSocket = useCallback(() => {
    // Close any existing connection before opening a new one
    if (wsRef.current) {
      wsRef.current.onclose = null;  // prevent reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = process.env.NODE_ENV === 'development';
    const wsHost = isDev ? `${window.location.hostname}:8000` : window.location.host;
    const wsToken = _getWsToken();
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat${wsToken ? `?token=${encodeURIComponent(wsToken)}` : ''}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen    = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      handleWsMessageRef.current(msg);
    };
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Only reconnect if this is still the active connection and component is mounted
      if (isMountedRef.current && wsRef.current === ws) {
        setTimeout(connectWebSocket, 3000);
      }
    };
    ws.onerror = (err) => console.error('WebSocket error:', err);
  }, []);

  const getActiveStream = (): StreamContext | null => streamQueueRef.current[0] ?? null;

  const isBackgroundStream = (ctx: StreamContext) =>
    ctx.convId !== convIdRef.current;

  const updateLastTurn = (ctx: StreamContext, patch: Partial<ConversationTurn>) => {
    if (isBackgroundStream(ctx)) {
      const bg = ctx.turns;
      if (bg && bg.length > 0) {
        bg[bg.length - 1] = { ...bg[bg.length - 1], ...patch };
      }
    } else {
      setTurns(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        // Skip update if all patched values are already identical
        const changed = (Object.keys(patch) as (keyof ConversationTurn)[]).some(
          k => patch[k] !== last[k],
        );
        if (!changed) return prev;
        const next = prev.slice();
        next[next.length - 1] = { ...last, ...patch };
        return next;
      });
    }
  };

  /** When a stream completes, shift it off the queue and promote next if needed. */
  const finalizeStream = (ctx: StreamContext) => {
    const isBg = isBackgroundStream(ctx);

    if (isBg) {
      // Save background conversation to localStorage
      saveConvData({ id: ctx.convId, turns: ctx.turns ?? [], history: ctx.history ?? [] });
      const bgTurns = ctx.turns ?? [];
      if (bgTurns.length === 1) {
        const turn = bgTurns[0];
        generateConvTitle(turn.leftUser, turn.rightAi, turn.sourceLanguage, ctx.convId);
      }
    } else {
      setIsProcessing(false);
      const currentTurns = turnsRef.current;
      if (currentTurns.length === 1) {
        const turn = currentTurns[0];
        generateConvTitle(turn.leftUser, turn.rightAi, turn.sourceLanguage);
      }
    }

    // Remove completed stream from queue
    streamQueueRef.current = streamQueueRef.current.filter(s => s !== ctx);

    // If the next stream in queue belongs to the foreground, mark processing
    const next = getActiveStream();
    if (next && !isBackgroundStream(next)) {
      setIsProcessing(true);
    }
  };

  const handleWebSocketMessage = (msg: WebSocketMessage) => {
    const ctx = getActiveStream();
    if (!ctx) return;

    switch (msg.type) {
      case 'input_translation_chunk':
        ctx.rightUserAccumulator += msg.content;
        updateLastTurn(ctx, { rightUser: ctx.rightUserAccumulator, rightUserStatus: 'streaming' });
        break;

      case 'translation_complete':
        if (msg.step === 'input_translation') {
          ctx.pendingEnglishInput = msg.content;
          updateLastTurn(ctx, { rightUser: msg.content, rightUserStatus: 'complete' });
        }
        break;

      case 'processing_start':
        ctx.rightAiAccumulator = '';
        ctx.rightAiThinkingAccumulator = '';
        updateLastTurn(ctx, { rightAiStatus: 'streaming' });
        break;

      case 'thinking_start':
        ctx.rightAiThinkingAccumulator = '';
        updateLastTurn(ctx, { rightAiThinking: '', rightAiThinkingStatus: 'streaming' });
        break;

      case 'thinking_chunk':
        ctx.rightAiThinkingAccumulator += msg.content;
        updateLastTurn(ctx, { rightAiThinking: ctx.rightAiThinkingAccumulator, rightAiThinkingStatus: 'streaming' });
        break;

      case 'thinking_complete':
        updateLastTurn(ctx, { rightAiThinkingStatus: 'complete' });
        break;

      case 'thinking_translation_start':
        ctx.leftAiThinkingAccumulator = '';
        updateLastTurn(ctx, { leftAiThinking: '', leftAiThinkingStatus: 'streaming' });
        break;

      case 'thinking_translation_chunk':
        ctx.leftAiThinkingAccumulator += msg.content;
        updateLastTurn(ctx, { leftAiThinking: ctx.leftAiThinkingAccumulator, leftAiThinkingStatus: 'streaming' });
        break;

      case 'thinking_translation_complete':
        updateLastTurn(ctx, { leftAiThinkingStatus: 'complete' });
        break;

      case 'processing_chunk':
        ctx.rightAiAccumulator += msg.content;
        updateLastTurn(ctx, { rightAi: ctx.rightAiAccumulator, rightAiStatus: 'streaming' });
        break;

      case 'processing_complete': {
        const newEntries = [
          { role: 'user' as const,      content: ctx.pendingEnglishInput },
          { role: 'assistant' as const, content: msg.content },
        ];
        if (isBackgroundStream(ctx)) {
          ctx.history = [...(ctx.history ?? []), ...newEntries];
        } else {
          conversationHistoryRef.current = [...conversationHistoryRef.current, ...newEntries];
        }
        updateLastTurn(ctx, { rightAi: msg.content, rightAiStatus: 'complete' });
        break;
      }

      case 'output_translation_chunk':
        ctx.leftAiAccumulator += msg.content;
        updateLastTurn(ctx, { leftAi: ctx.leftAiAccumulator, leftAiStatus: 'streaming' });
        break;

      case 'final_translation': {
        if (msg.metadata?.skipped) {
          updateLastTurn(ctx, { leftAi: msg.content, leftAiStatus: 'complete', status: 'complete' });
        } else if (ctx.leftAiAccumulator) {
          updateLastTurn(ctx, { leftAiStatus: 'complete', status: 'complete' });
        } else {
          updateLastTurn(ctx, { leftAi: msg.content, leftAiStatus: 'complete', status: 'complete' });
        }
        finalizeStream(ctx);
        break;
      }

      case 'prompt_routing_start':
        break;

      case 'prompt_routing_label':
        updateLastTurn(ctx, {
          routingLabel: msg.metadata?.template_label ?? msg.content,
        });
        break;

      case 'prompt_routing_chunk':
        ctx.refinedPromptAccumulator += msg.content;
        updateLastTurn(ctx, {
          refinedPrompt:       ctx.refinedPromptAccumulator,
          refinedPromptStatus: 'streaming',
        });
        break;

      case 'prompt_routing_complete':
        updateLastTurn(ctx, {
          refinedPrompt:       msg.content,
          refinedPromptStatus: 'complete',
        });
        break;

      case 'prompt_routing_translation_chunk':
        ctx.leftRefinedPromptAccumulator += msg.content;
        updateLastTurn(ctx, {
          leftRefinedPrompt:       ctx.leftRefinedPromptAccumulator,
          leftRefinedPromptStatus: 'streaming',
        });
        break;

      case 'prompt_routing_translation_complete':
        updateLastTurn(ctx, { leftRefinedPromptStatus: 'complete' });
        break;

      case 'stopped':
        // Mark all streaming statuses as complete so partial content stays visible
        updateLastTurn(ctx, {
          status: 'complete',
          leftAiStatus:  ctx.leftAiAccumulator  ? 'complete' : 'idle',
          rightAiStatus: ctx.rightAiAccumulator ? 'complete' : 'idle',
          rightUserStatus: ctx.rightUserAccumulator ? 'complete' : 'idle',
          rightAiThinkingStatus: ctx.rightAiThinkingAccumulator ? 'complete' : undefined,
          leftAiThinkingStatus:  ctx.leftAiThinkingAccumulator  ? 'complete' : undefined,
        });
        finalizeStream(ctx);
        break;

      case 'error':
        if (msg.metadata?.quota_exceeded) {
        }
        updateLastTurn(ctx, { status: 'error', error: msg.content, leftAiStatus: 'complete', rightAiStatus: 'complete' });
        finalizeStream(ctx);
        break;

      default:
        break;
    }
  };

  // Check if any API key is available (server-side or user-provided)
  const hasAnyApiKey = useCallback(() => {
    // Server has pre-configured providers
    if (availableProviders.length > 0) return true;
    // User has provided at least one key
    const keys = settings.apiKeys;
    return !!(keys.deepseek || keys.openai || keys.anthropic || keys.google || keys.qwen);
  }, [availableProviders, settings.apiKeys]);

  const handleSend = (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      return;
    }

    // Prompt user to configure API keys if none are available
    if (!hasAnyApiKey()) {
      setApiConfigOpen(true);
      return;
    }

    // Auto-create a conversation if none is active
    if (!activeConvId) {
      const id = generateId();
      const now = Date.now();
      const meta: ConversationMeta = { id, title: '', createdAt: now, updatedAt: now };
      setConvIndex(prev => [meta, ...prev].slice(0, MAX_CONVERSATIONS));
      setActiveConvId(id);
      convIdRef.current = id;
    }

    // Move conversation to top of list
    touchConvTimestamp();

    // Push a new stream context onto the queue
    const streamCtx: StreamContext = {
      convId: convIdRef.current!,
      rightUserAccumulator: '',
      rightAiAccumulator: '',
      rightAiThinkingAccumulator: '',
      leftAiThinkingAccumulator: '',
      leftAiAccumulator: '',
      refinedPromptAccumulator: '',
      leftRefinedPromptAccumulator: '',
      pendingEnglishInput: '',
      turns: null,   // foreground — React state is source of truth
      history: null,
    };
    streamQueueRef.current.push(streamCtx);

    const newTurn: ConversationTurn = {
      id:                `${Date.now()}-${Math.random()}`,
      timestamp:         new Date(),
      sourceLanguage:    settings.sourceLanguage,
      targetLanguage:    settings.sourceLanguage,
      processingLanguage:settings.processingLanguage,
      translationMethod: settings.translationMethod,
      leftUser:          message,
      leftAi:            '',
      leftAiStatus:      'pending',
      rightUser:         '',
      rightUserStatus:   'translating',
      rightAi:           '',
      rightAiStatus:     'idle',
      status:            'active',
    };

    setTurns(prev => [...prev, newTurn]);
    setIsProcessing(true);
    setScrollTrigger(n => n + 1);
    wsRef.current.send(JSON.stringify({
      message,
      source_language:          settings.sourceLanguage,
      target_language:          settings.sourceLanguage,
      response_type:            settings.responseType,
      processing_language:      settings.processingLanguage,
      translation_method:       settings.translationMethod,
      enable_prompt_routing:    settings.enablePromptRouting,
      conversation_history:     conversationHistoryRef.current,
      deepseek_api_key:         settings.apiKeys.deepseek,
      openai_api_key:           settings.apiKeys.openai,
      anthropic_api_key:        settings.apiKeys.anthropic,
      google_api_key:           settings.apiKeys.google,
      qwen_api_key:             settings.apiKeys.qwen,
      qwen_base_url:            settings.qwenRegion === 'cn'
                                  ? 'https://dashscope.aliyuncs.com/compatible-mode/v1'
                                  : 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      main_llm_provider:        settings.mainLlm.provider,
      main_llm_model:           settings.mainLlm.model,
      translation_llm_provider: settings.translationLlm.provider,
      translation_llm_model:    settings.translationLlm.model,
    }));
  };

  const handleStop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  }, []);

  const t = getT(settings.sourceLanguage);

  return (
    <div
      className="h-screen h-dvh flex overflow-hidden"
      style={{
        background: '#0B0B14',
        backgroundImage:
          'radial-gradient(ellipse at 18% 12%, rgba(124,58,237,0.16) 0%, transparent 50%),' +
          'radial-gradient(ellipse at 82% 88%, rgba(6,182,212,0.12) 0%, transparent 50%)',
      }}
    >
      {/* ── Sidebar (inline, always pinned when open) ─────────────── */}
      <ChatHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={convIndex}
        activeId={activeConvId}
        onSelect={switchConversation}
        onNew={createNewConversation}
        onDelete={deleteConversation}
        t={t}
      />

      {/* ── Main content column ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* ── Fixed header ──────────────────────────────────────────── */}
      <header className="relative flex-shrink-0 flex items-center justify-between px-2 md:px-6 h-[46px] md:h-[58px] bg-[rgba(11,11,20,0.82)] backdrop-blur-xl">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* History toggle button */}
          <button
            onClick={() => setHistoryOpen(prev => !prev)}
            aria-label={t.chatHistory}
            className={`flex-shrink-0 w-9 h-9 md:w-8 md:h-8 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer ${
              historyOpen ? 'text-violet-400/70 bg-violet-500/[0.10]' : 'text-white/35 hover:text-white/75 hover:bg-white/[0.06]'
            }`}
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
            </svg>
          </button>

          {/* Logo mark + title — links to GitHub */}
          <a
            href="https://github.com/Sun-Yize/Ask-LLM-in-Multi-Lang"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 md:gap-3 min-w-0 no-underline"
          >
            {/* Logo mark with glow halo */}
            <div className="relative flex-shrink-0 w-7 h-7 md:w-8 md:h-8">
              <div className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 blur-[7px] opacity-55" />
              <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
                </svg>
              </div>
            </div>
            {/* Gradient title + subtitle */}
            <div className="flex flex-col gap-[1px] min-w-0">
              <span
                className="text-[15px] md:text-[18px] font-bold tracking-[-0.3px] leading-tight truncate"
                style={{ background: 'linear-gradient(90deg, #c4b5fd 0%, #f0f0ff 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {t.appTitle}
              </span>
              <span className="hidden md:inline text-[11px] text-white/50 tracking-[0.1px] leading-relaxed">
                {t.appTagline
                  .replace('{source}', t.languageNames[settings.sourceLanguage] ?? settings.sourceLanguage)
                  .replace('{processing}', t.languageNames[settings.processingLanguage] ?? settings.processingLanguage)}
              </span>
            </div>
          </a>
        </div>

        {/* Header buttons */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {/* Model config button */}
          <button
              onClick={() => setApiConfigOpen(true)}
              aria-label="Open model configuration"
              className="flex items-center gap-2 px-2.5 py-2 md:px-3.5 text-[12.5px] font-semibold text-white/45 hover:text-white/85 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4 md:w-3.5 md:h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
              </svg>
              <span className="hidden md:inline tracking-[0.15px]">{t.modelButton}</span>
            </button>

          {/* Settings button — gear rotates on hover */}
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="group flex items-center gap-2 px-2.5 py-2 md:px-3.5 text-[12.5px] font-semibold text-white/45 hover:text-white/85 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4 md:w-3.5 md:h-3.5 transition-transform duration-300 group-hover:rotate-[55deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="hidden md:inline tracking-[0.15px]">{t.settings}</span>
          </button>
        </div>

        {/* Bottom separator — dual-tone, maps to the two columns below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(6,182,212,0.28) 50%, rgba(6,182,212,0.28) 100%)' }}
        />
      </header>

      {/* ── Dual-column conversation ───────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <DualColumnView turns={turns} settings={settings} languages={languages} scrollTrigger={scrollTrigger} />

        {/* ── Floating stop pill ──────────────────────────────────── */}
        {isProcessing && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 pointer-events-none animate-fade-in">
            <button
              onClick={handleStop}
              className="pointer-events-auto flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-[#1a1a2e]/90 backdrop-blur-md border border-white/[0.12] text-white/50 hover:text-white/70 hover:border-white/[0.22] hover:bg-[#1a1a2e] shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-200 cursor-pointer active:scale-95"
            >
              <span className="relative flex items-center justify-center w-5 h-5">
                <svg className="absolute inset-0 w-5 h-5 animate-spin" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8.5" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
                  <path d="M10 1.5a8.5 8.5 0 0 1 8.5 8.5" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <svg className="relative w-[7px] h-[7px]" viewBox="0 0 8 8" fill="currentColor">
                  <rect width="8" height="8" rx="1.5" />
                </svg>
              </span>
              <span className="text-[13px] font-medium tracking-wide">{t.stopGeneration}</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Input bar ─────────────────────────────────────────────── */}
      <InputBar onSend={handleSend} disabled={isProcessing} sourceLanguage={settings.sourceLanguage} sidebarOpen={historyOpen} noApiKey={!hasAnyApiKey()} onApiKeyClick={() => setApiConfigOpen(true)} />
      </div>{/* end main content column */}

      {/* ── Settings modal ────────────────────────────────────────── */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        languages={languages}
        responseTypes={responseTypes}
      />

      {/* ── API config modal ──────────────────────────────────────── */}
      <ApiConfigModal
        isOpen={apiConfigOpen}
        onClose={() => setApiConfigOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        allowUserApiKeys={allowUserApiKeys}
        availableProviders={availableProviders}
      />
    </div>
  );
};

export default TranslationChat;
