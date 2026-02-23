import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConversationTurn, WebSocketMessage, Language, ResponseType, ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';
import DualColumnView from './DualColumnView';
import SettingsModal from './SettingsModal';
import InputBar from './InputBar';

const NATIVE_NAMES: Record<string, string> = {
  english:  'English',
  chinese:  '中文',
  japanese: '日本語',
  korean:   '한국어',
};

const DEFAULT_SETTINGS: ChatSettings = {
  sourceLanguage:     'chinese',
  processingLanguage: 'english',
  responseType:       'general',
  translationMethod:  'llm',
};

const TranslationChat: React.FC = () => {
  const [turns, setTurns]               = useState<ConversationTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings]         = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [languages, setLanguages]       = useState<Language[]>([]);
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>([]);

  const wsRef              = useRef<WebSocket | null>(null);
  const isMountedRef       = useRef(true);
  const handleWsMessageRef = useRef<(msg: WebSocketMessage) => void>(() => {});

  const conversationHistoryRef  = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const pendingEnglishInputRef    = useRef('');
  const rightUserAccumulatorRef   = useRef('');
  const rightAiAccumulatorRef     = useRef('');
  const leftAiAccumulatorRef      = useRef('');

  useEffect(() => {
    handleWsMessageRef.current = handleWebSocketMessage;
  });

  useEffect(() => {
    loadLanguages();
    loadResponseTypes();
    connectWebSocket();
    return () => {
      isMountedRef.current = false;
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLanguages = async () => {
    try {
      const res  = await fetch('/api/languages');
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
      const res  = await fetch('/api/response-types');
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

  const connectWebSocket = useCallback(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development, connect directly to the backend port to bypass CRA's
    // WebSocket proxy limitations. In production, nginx routes /ws/ correctly.
    const isDev = process.env.NODE_ENV === 'development';
    const wsHost = isDev ? `${window.location.hostname}:8000` : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat`;

    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onopen    = () => console.log('WebSocket connected');
    wsRef.current.onmessage = (event) => {
      const msg: WebSocketMessage = JSON.parse(event.data);
      handleWsMessageRef.current(msg);
    };
    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      if (isMountedRef.current) setTimeout(connectWebSocket, 3000);
    };
    wsRef.current.onerror = (err) => console.error('WebSocket error:', err);
  }, []);

  const updateLastTurn = (patch: Partial<ConversationTurn>) => {
    setTurns(prev => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return next;
    });
  };

  const handleWebSocketMessage = (msg: WebSocketMessage) => {
    switch (msg.type) {
      case 'input_translation_chunk':
        rightUserAccumulatorRef.current += msg.content;
        updateLastTurn({ rightUser: rightUserAccumulatorRef.current, rightUserStatus: 'streaming' });
        break;

      case 'translation_complete':
        if (msg.step === 'input_translation') {
          pendingEnglishInputRef.current = msg.content;
          updateLastTurn({ rightUser: msg.content, rightUserStatus: 'complete' });
        }
        break;

      case 'processing_start':
        rightAiAccumulatorRef.current = '';
        updateLastTurn({ rightAiStatus: 'streaming' });
        break;

      case 'processing_chunk':
        rightAiAccumulatorRef.current += msg.content;
        updateLastTurn({ rightAi: rightAiAccumulatorRef.current, rightAiStatus: 'streaming' });
        break;

      case 'processing_complete':
        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          { role: 'user',      content: pendingEnglishInputRef.current },
          { role: 'assistant', content: msg.content },
        ];
        updateLastTurn({ rightAi: msg.content, rightAiStatus: 'complete' });
        break;

      case 'output_translation_chunk':
        leftAiAccumulatorRef.current += msg.content;
        updateLastTurn({ leftAi: leftAiAccumulatorRef.current, leftAiStatus: 'streaming' });
        break;

      case 'final_translation':
        if (msg.metadata?.skipped) {
          updateLastTurn({ leftAi: msg.content, leftAiStatus: 'complete', status: 'complete' });
        } else if (leftAiAccumulatorRef.current) {
          updateLastTurn({ leftAiStatus: 'complete', status: 'complete' });
        } else {
          updateLastTurn({ leftAi: msg.content, leftAiStatus: 'complete', status: 'complete' });
        }
        setIsProcessing(false);
        break;

      case 'error':
        updateLastTurn({ status: 'error', error: msg.content, leftAiStatus: 'complete', rightAiStatus: 'complete' });
        setIsProcessing(false);
        break;

      default:
        break;
    }
  };

  const handleSend = (message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket();
      return;
    }

    rightUserAccumulatorRef.current = '';
    rightAiAccumulatorRef.current   = '';
    leftAiAccumulatorRef.current    = '';

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

    wsRef.current.send(JSON.stringify({
      message,
      source_language:      settings.sourceLanguage,
      target_language:      settings.sourceLanguage,
      response_type:        settings.responseType,
      processing_language:  settings.processingLanguage,
      translation_method:   settings.translationMethod,
      conversation_history: conversationHistoryRef.current,
    }));
  };

  const t = getT(settings.sourceLanguage);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: '#0B0B14',
        backgroundImage:
          'radial-gradient(ellipse at 18% 12%, rgba(124,58,237,0.16) 0%, transparent 50%),' +
          'radial-gradient(ellipse at 82% 88%, rgba(6,182,212,0.12) 0%, transparent 50%)',
      }}
    >
      {/* ── Fixed header ──────────────────────────────────────────── */}
      <header className="relative flex-shrink-0 flex items-center justify-between px-6 h-[58px] bg-[rgba(11,11,20,0.82)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {/* Logo mark with glow halo */}
          <div className="relative flex-shrink-0 w-8 h-8">
            <div className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 blur-[7px] opacity-55" />
            <div className="relative w-8 h-8 rounded-[10px] bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
              </svg>
            </div>
          </div>
          {/* Gradient title + subtitle */}
          <div className="flex flex-col gap-0">
            <span
              className="text-[18px] font-bold tracking-[-0.3px] leading-tight"
              style={{ background: 'linear-gradient(90deg, #c4b5fd 0%, #f0f0ff 50%, #67e8f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {t.appTitle}
            </span>
            <span className="text-[11px] text-white/50 tracking-[0.1px] leading-tight">
              Ask in Any Language, Think in English
            </span>
          </div>
        </div>

        {/* Settings button — gear rotates on hover */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="group flex items-center gap-2 px-3.5 py-2 text-[12.5px] font-semibold text-white/45 hover:text-white/85 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-[55deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span className="tracking-[0.15px]">{t.settings}</span>
        </button>

        {/* Bottom separator — dual-tone, maps to the two columns below */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.35) 50%, rgba(6,182,212,0.28) 50%, rgba(6,182,212,0.28) 100%)' }}
        />
      </header>

      {/* ── Dual-column conversation ───────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <DualColumnView turns={turns} settings={settings} languages={languages} />
      </div>

      {/* ── Input bar ─────────────────────────────────────────────── */}
      <InputBar onSend={handleSend} disabled={isProcessing} sourceLanguage={settings.sourceLanguage} />

      {/* ── Settings modal ────────────────────────────────────────── */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        languages={languages}
        responseTypes={responseTypes}
      />
    </div>
  );
};

export default TranslationChat;
