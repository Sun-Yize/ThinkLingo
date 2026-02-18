import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConversationTurn, WebSocketMessage, Language, ResponseType, ChatSettings } from '../types/chat';
import DualColumnView from './DualColumnView';
import SettingsModal from './SettingsModal';
import InputBar from './InputBar';

const DEFAULT_SETTINGS: ChatSettings = {
  sourceLanguage: 'english',
  targetLanguage: 'english',
  responseType: 'general',
  translationMethod: 'google',
};

const TranslationChat: React.FC = () => {
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [responseTypes, setResponseTypes] = useState<ResponseType[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const isMountedRef = useRef(true);
  const handleWsMessageRef = useRef<(msg: WebSocketMessage) => void>(() => {});

  // Refs for values used inside stale WS callbacks
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const pendingEnglishInputRef = useRef('');
  const rightAiAccumulatorRef = useRef('');
  const leftAiAccumulatorRef = useRef('');

  // Keep the handler ref fresh on every render
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
      const res = await fetch('/api/languages');
      setLanguages(await res.json());
    } catch {
      setLanguages([
        { key: 'english', name: 'English', native_name: 'English' },
        { key: 'chinese', name: 'Chinese', native_name: '中文' },
        { key: 'japanese', name: 'Japanese', native_name: '日本語' },
        { key: 'korean', name: 'Korean', native_name: '한국어' },
      ]);
    }
  };

  const loadResponseTypes = async () => {
    try {
      const res = await fetch('/api/response-types');
      const data = await res.json();
      setResponseTypes(
        Object.entries(data).map(([key, description]) => ({ key, description: description as string }))
      );
    } catch {
      setResponseTypes([
        { key: 'general', description: 'General purpose' },
        { key: 'creative', description: 'Creative' },
        { key: 'analytical', description: 'Analytical' },
        { key: 'educational', description: 'Educational' },
        { key: 'technical', description: 'Technical' },
      ]);
    }
  };

  const connectWebSocket = useCallback(() => {
    const wsUrl =
      process.env.NODE_ENV === 'production'
        ? `wss://${window.location.host}/ws/chat`
        : 'ws://localhost:8000/ws/chat';

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => console.log('WebSocket connected');

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

  /** Patch the last turn in state */
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
          { role: 'user', content: pendingEnglishInputRef.current },
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
          // Same language — copy right AI content directly
          updateLastTurn({
            leftAi: msg.content,
            leftAiStatus: 'complete',
            status: 'complete',
          });
        } else if (leftAiAccumulatorRef.current) {
          // LLM streaming was used — mark complete, content already accumulated
          updateLastTurn({ leftAiStatus: 'complete', status: 'complete' });
        } else {
          // Google translate — batch result arrives now
          updateLastTurn({
            leftAi: msg.content,
            leftAiStatus: 'complete',
            status: 'complete',
          });
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

    // Reset accumulators for this turn
    rightAiAccumulatorRef.current = '';
    leftAiAccumulatorRef.current = '';

    const newTurn: ConversationTurn = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      sourceLanguage: settings.sourceLanguage,
      targetLanguage: settings.targetLanguage,
      processingLanguage: 'english',
      translationMethod: settings.translationMethod,
      leftUser: message,
      leftAi: '',
      leftAiStatus: 'pending',
      rightUser: '',
      rightUserStatus: 'translating',
      rightAi: '',
      rightAiStatus: 'idle',
      status: 'active',
    };

    setTurns(prev => [...prev, newTurn]);
    setIsProcessing(true);

    wsRef.current.send(
      JSON.stringify({
        message,
        source_language: settings.sourceLanguage,
        target_language: settings.targetLanguage,
        response_type: settings.responseType,
        processing_language: 'english',
        translation_method: settings.translationMethod,
        conversation_history: conversationHistoryRef.current,
      })
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Fixed header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-lg font-semibold text-gray-900">Translation Chat</h1>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span>⚙</span>
          <span>设置</span>
        </button>
      </header>

      {/* Dual-column conversation area */}
      <div className="flex-1 overflow-hidden">
        <DualColumnView turns={turns} settings={settings} languages={languages} />
      </div>

      {/* Fixed input bar */}
      <InputBar onSend={handleSend} disabled={isProcessing} />

      {/* Settings modal */}
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
