export interface UIText {
  // Header / navigation
  appTitle: string;
  settings: string;

  // Settings modal
  sourceLanguage: string;
  processingLanguage: string;
  responseType: string;
  translationMethod: string;
  translationMethodGoogle: string;
  translationMethodLLM: string;
  done: string;

  // Column headers
  leftColLabel: string;
  rightColLabel: string;

  // Input bar
  inputPlaceholder: string;
  inputHint: string;

  // States
  translating: string;
  emptyStateSame: string;
  emptyStateDiff: string;

  // Response type labels (key → localized label)
  responseTypeLabels: Record<string, string>;
}

const texts: Record<string, UIText> = {
  english: {
    appTitle: 'Translation Chat',
    settings: 'Settings',

    sourceLanguage: 'Source Language',
    processingLanguage: 'Processing Language',
    responseType: 'Response Type',
    translationMethod: 'Translation Method',
    translationMethodGoogle: 'Google Translate (Fast)',
    translationMethodLLM: 'LLM Translation (High quality, streaming)',
    done: 'Done',

    leftColLabel: 'Original / Target',
    rightColLabel: 'Processing Language',

    inputPlaceholder: 'Ask anything… (Enter to send, Shift+Enter for newline)',
    inputHint: 'Enter to send · Shift+Enter for newline',

    translating: 'Translating…',
    emptyStateSame: 'Both columns show identical content (source = processing language)',
    emptyStateDiff: 'Left: source/target language  ·  Right: processing language',

    responseTypeLabels: {
      general:    'General — everyday queries',
      creative:   'Creative — imaginative responses',
      analytical: 'Analytical — structured reasoning',
      educational:'Educational — clear explanations',
      technical:  'Technical — precise terminology',
    },
  },

  chinese: {
    appTitle: 'Translation Chat',
    settings: '设置',

    sourceLanguage: '源语言',
    processingLanguage: '处理语言',
    responseType: '回复类型',
    translationMethod: '翻译方式',
    translationMethodGoogle: 'Google 翻译（快速）',
    translationMethodLLM: 'LLM 翻译（高质量，支持流式）',
    done: '完成',

    leftColLabel: '原始 / 目标',
    rightColLabel: '处理语言',

    inputPlaceholder: '用任何语言提问… (Enter 发送，Shift+Enter 换行)',
    inputHint: 'Enter 发送 · Shift+Enter 换行',

    translating: '翻译中…',
    emptyStateSame: '两列内容相同（源语言与处理语言一致）',
    emptyStateDiff: '左列：原文 / 目标语言  ·  右列：处理语言',

    responseTypeLabels: {
      general:    '通用 — 日常对话',
      creative:   '创意 — 创意性回答',
      analytical: '分析 — 结构化推理',
      educational:'教育 — 清晰讲解',
      technical:  '技术 — 专业术语',
    },
  },

  japanese: {
    appTitle: 'Translation Chat',
    settings: '設定',

    sourceLanguage: 'ソース言語',
    processingLanguage: '処理言語',
    responseType: '応答タイプ',
    translationMethod: '翻訳方法',
    translationMethodGoogle: 'Google 翻訳（高速）',
    translationMethodLLM: 'LLM 翻訳（高品質・ストリーミング対応）',
    done: '完了',

    leftColLabel: '元の言語 / 対象言語',
    rightColLabel: '処理言語',

    inputPlaceholder: '何でも入力してください… (Enter で送信、Shift+Enter で改行)',
    inputHint: 'Enter で送信 · Shift+Enter で改行',

    translating: '翻訳中…',
    emptyStateSame: '両列は同じ内容です（ソース言語 = 処理言語）',
    emptyStateDiff: '左列：元の言語  ·  右列：処理言語',

    responseTypeLabels: {
      general:    '一般 — 日常的な質問',
      creative:   'クリエイティブ — 創造的な回答',
      analytical: '分析的 — 構造化された推論',
      educational:'教育的 — 明確な説明',
      technical:  '技術的 — 専門用語',
    },
  },

  korean: {
    appTitle: 'Translation Chat',
    settings: '설정',

    sourceLanguage: '소스 언어',
    processingLanguage: '처리 언어',
    responseType: '응답 유형',
    translationMethod: '번역 방법',
    translationMethodGoogle: 'Google 번역（빠름）',
    translationMethodLLM: 'LLM 번역（고품질·스트리밍 지원）',
    done: '완료',

    leftColLabel: '원본 / 대상',
    rightColLabel: '처리 언어',

    inputPlaceholder: '어떤 언어로든 질문하세요… (Enter로 전송, Shift+Enter로 줄바꿈)',
    inputHint: 'Enter로 전송 · Shift+Enter로 줄바꿈',

    translating: '번역 중…',
    emptyStateSame: '두 열은 동일한 내용입니다（소스 언어 = 처리 언어）',
    emptyStateDiff: '왼쪽：원본 언어  ·  오른쪽：처리 언어',

    responseTypeLabels: {
      general:    '일반 — 일상적인 질문',
      creative:   '창의적 — 창의적인 응답',
      analytical: '분석적 — 구조화된 추론',
      educational:'교육적 — 명확한 설명',
      technical:  '기술적 — 전문 용어',
    },
  },
};

export const getT = (sourceLanguage: string): UIText =>
  texts[sourceLanguage] ?? texts.english;
