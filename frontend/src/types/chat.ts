export interface ConversationTurn {
  id: string;
  timestamp: Date;
  sourceLanguage: string;
  targetLanguage: string;
  processingLanguage: string;
  translationMethod: string;

  // Left column (original/target language)
  leftUser: string;
  leftAi: string;
  leftAiStatus: 'idle' | 'pending' | 'streaming' | 'complete';

  // Right column (processing language, typically English)
  rightUser: string;
  rightUserStatus: 'idle' | 'translating' | 'streaming' | 'complete';
  rightAi: string;
  rightAiStatus: 'idle' | 'streaming' | 'complete';

  status: 'active' | 'complete' | 'error';
  error?: string;

  // Prompt routing (optional — only present when routing is enabled)
  routingLabel?: string;
  refinedPrompt?: string;
  refinedPromptStatus?: 'streaming' | 'complete';
}

export interface WebSocketMessage {
  type:
    | 'translation_start'
    | 'translation_complete'
    | 'processing_start'
    | 'processing_chunk'
    | 'processing_complete'
    | 'final_translation'
    | 'output_translation_chunk'
    | 'input_translation_chunk'
    | 'prompt_routing_start'
    | 'prompt_routing_label'
    | 'prompt_routing_chunk'
    | 'prompt_routing_complete'
    | 'error';
  step: string;
  content: string;
  metadata?: {
    from?: string;
    to?: string;
    original?: string;
    translated?: string;
    processing_language?: string;
    chunk_index?: number;
    is_final?: boolean;
    skipped?: boolean;
    template_label?: string;
    [key: string]: any;
  };
}

export interface Language {
  key: string;
  name: string;
  native_name?: string;
  code?: string;
}

export interface ResponseType {
  key: string;
  description: string;
}

export interface ChatSettings {
  sourceLanguage: string;
  processingLanguage: string;
  responseType: string;
  translationMethod: string;
  enablePromptRouting: boolean;
  apiKeys: {
    deepseek: string;
    openai: string;
    anthropic: string;
    google: string;
    qwen: string;
  };
  mainLlm: {
    provider: 'auto' | 'deepseek' | 'openai' | 'claude' | 'gemini' | 'qwen';
    model: string;
  };
  translationLlm: {
    provider: 'auto' | 'openai' | 'deepseek' | 'claude' | 'gemini' | 'qwen';
    model: string;
  };
  qwenRegion: 'cn' | 'intl';
}

export type ColumnFocus = 'both' | 'left' | 'right';
