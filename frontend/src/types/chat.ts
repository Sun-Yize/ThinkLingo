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
}
