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

  // Model / API configuration
  modelButton: string;
  apiConfig: string;
  deepseekApiKey: string;
  openaiApiKey: string;
  mainLlmProvider: string;
  translationLlmProvider: string;
  providerAuto: string;
  moreModelsHint: string;

  // Column headers
  leftColLabel: string;
  rightColLabel: string;

  // Input bar
  inputPlaceholder: string;
  inputHint: string;

  // States
  translating: string;
  thinking: string;
  translatingOutput: string;
  emptyStateSame: string;
  emptyStateDiff: string;

  // Prompt routing
  promptRouting: string;
  promptRoutingOn: string;
  promptRoutingOff: string;
  promptRoutingHint: string;
  promptRoutingActive: string;
  routingBadgePrefix: string;
  refinedPromptLabel: string;

  // Chat history sidebar
  newChat: string;
  chatHistory: string;
  deleteChat: string;
  confirmDeleteTitle: string;
  confirmDeleteMessage: string;
  cancel: string;
  today: string;
  yesterday: string;
  older: string;
  untitledChat: string;

  // Response type labels (key → localized label)
  responseTypeLabels: Record<string, string>;
}

const texts: Record<string, UIText> = {
  english: {
    appTitle: 'ThinkLingo',
    settings: 'Settings',

    sourceLanguage: 'Source Language',
    processingLanguage: 'Processing Language',
    responseType: 'Response Type',
    translationMethod: 'Translation Method',
    translationMethodGoogle: 'Google Translate (Fast)',
    translationMethodLLM: 'LLM Translation (High quality, streaming)',
    done: 'Done',

    modelButton: 'Model',
    apiConfig: 'Model Configuration',
    deepseekApiKey: 'DeepSeek API Key',
    openaiApiKey: 'OpenAI API Key',
    mainLlmProvider: 'Reasoning LLM',
    translationLlmProvider: 'Translation LLM',
    providerAuto: 'Auto',
    moreModelsHint: 'Want to use OpenAI, Claude, or other models? Deploy your own instance on',

    leftColLabel: 'Original / Target',
    rightColLabel: 'Processing Language',

    inputPlaceholder: 'Ask anything… (Enter to send, Shift+Enter for newline)',
    inputHint: 'Enter to send · Shift+Enter for newline',

    translating: 'Translating…',
    thinking: 'Thinking…',
    translatingOutput: 'Translating response…',
    emptyStateSame: 'Both columns show identical content (source = processing language)',
    emptyStateDiff: 'Left: source/target language  ·  Right: processing language',

    promptRouting: 'Smart Prompt Routing',
    promptRoutingOn: 'Enabled',
    promptRoutingOff: 'Disabled',
    promptRoutingHint: 'Automatically select the best system prompt for each message',
    promptRoutingActive: 'Selecting best prompt…',
    routingBadgePrefix: 'Prompt:',
    refinedPromptLabel: 'System Prompt',

    newChat: 'New Chat',
    chatHistory: 'Chat History',
    deleteChat: 'Delete',
    confirmDeleteTitle: 'Delete Conversation',
    confirmDeleteMessage: 'Are you sure you want to delete this conversation? This action cannot be undone.',
    cancel: 'Cancel',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older',
    untitledChat: 'Untitled Chat',

    responseTypeLabels: {
      general:     'General — everyday queries',
      creative:    'Creative — imaginative responses',
      analytical:  'Analytical — structured reasoning',
      educational: 'Educational — clear explanations',
      technical:   'Technical — precise terminology',
    },
  },

  chinese: {
    appTitle: 'ThinkLingo',
    settings: '设置',

    sourceLanguage: '源语言',
    processingLanguage: '处理语言',
    responseType: '回复类型',
    translationMethod: '翻译方式',
    translationMethodGoogle: 'Google 翻译（快速）',
    translationMethodLLM: 'LLM 翻译（高质量，支持流式）',
    done: '完成',

    modelButton: '模型',
    apiConfig: '模型配置',
    deepseekApiKey: 'DeepSeek API Key',
    openaiApiKey: 'OpenAI API Key',
    mainLlmProvider: '推理模型',
    translationLlmProvider: '翻译模型',
    providerAuto: '自动',
    moreModelsHint: '想使用 OpenAI、Claude 等更多模型？前往 GitHub 部署你自己的实例',

    leftColLabel: '原始 / 目标',
    rightColLabel: '处理语言',

    inputPlaceholder: '随便问点什么… (Enter 发送，Shift+Enter 换行)',
    inputHint: 'Enter 发送 · Shift+Enter 换行',

    translating: '翻译中…',
    thinking: '思考中…',
    translatingOutput: '正在翻译回复…',
    emptyStateSame: '两列内容相同（源语言与处理语言一致）',
    emptyStateDiff: '左列：原文 / 目标语言  ·  右列：处理语言',

    promptRouting: '智能提示词路由',
    promptRoutingOn: '已启用',
    promptRoutingOff: '已禁用',
    promptRoutingHint: '自动为每条消息选择最佳系统提示词',
    promptRoutingActive: '正在选择提示词…',
    routingBadgePrefix: '模板：',
    refinedPromptLabel: '系统提示词',

    newChat: '新对话',
    chatHistory: '对话记录',
    deleteChat: '删除',
    confirmDeleteTitle: '删除对话',
    confirmDeleteMessage: '确定要删除这个对话吗？此操作无法撤销。',
    cancel: '取消',
    today: '今天',
    yesterday: '昨天',
    older: '更早',
    untitledChat: '未命名对话',

    responseTypeLabels: {
      general:     '通用 — 日常对话',
      creative:    '创意 — 创意性回答',
      analytical:  '分析 — 结构化推理',
      educational: '教育 — 清晰讲解',
      technical:   '技术 — 专业术语',
    },
  },

  japanese: {
    appTitle: 'ThinkLingo',
    settings: '設定',

    sourceLanguage: 'ソース言語',
    processingLanguage: '処理言語',
    responseType: '応答タイプ',
    translationMethod: '翻訳方法',
    translationMethodGoogle: 'Google 翻訳（高速）',
    translationMethodLLM: 'LLM 翻訳（高品質・ストリーミング対応）',
    done: '完了',

    modelButton: 'モデル',
    apiConfig: 'モデル設定',
    deepseekApiKey: 'DeepSeek API キー',
    openaiApiKey: 'OpenAI API キー',
    mainLlmProvider: '推論モデル',
    translationLlmProvider: '翻訳モデル',
    providerAuto: '自動',
    moreModelsHint: 'OpenAI や Claude など他のモデルを使いたい場合は、GitHub から自分のインスタンスをデプロイできます',

    leftColLabel: '元の言語 / 対象言語',
    rightColLabel: '処理言語',

    inputPlaceholder: '何でも聞いてください… (Enter で送信、Shift+Enter で改行)',
    inputHint: 'Enter で送信 · Shift+Enter で改行',

    translating: '翻訳中…',
    thinking: '考え中…',
    translatingOutput: '回答を翻訳中…',
    emptyStateSame: '両列は同じ内容です（ソース言語 = 処理言語）',
    emptyStateDiff: '左列：元の言語  ·  右列：処理言語',

    promptRouting: 'スマートプロンプトルーティング',
    promptRoutingOn: '有効',
    promptRoutingOff: '無効',
    promptRoutingHint: '各メッセージに最適なシステムプロンプトを自動選択',
    promptRoutingActive: 'プロンプトを選択中…',
    routingBadgePrefix: 'テンプレート:',
    refinedPromptLabel: 'システムプロンプト',

    newChat: '新しいチャット',
    chatHistory: 'チャット履歴',
    deleteChat: '削除',
    confirmDeleteTitle: '会話を削除',
    confirmDeleteMessage: 'この会話を削除しますか？この操作は元に戻せません。',
    cancel: 'キャンセル',
    today: '今日',
    yesterday: '昨日',
    older: 'それ以前',
    untitledChat: '無題のチャット',

    responseTypeLabels: {
      general:     '一般 — 日常的な質問',
      creative:    'クリエイティブ — 創造的な回答',
      analytical:  '分析的 — 構造化された推論',
      educational: '教育的 — 明確な説明',
      technical:   '技術的 — 専門用語',
    },
  },

  korean: {
    appTitle: 'ThinkLingo',
    settings: '설정',

    sourceLanguage: '소스 언어',
    processingLanguage: '처리 언어',
    responseType: '응답 유형',
    translationMethod: '번역 방법',
    translationMethodGoogle: 'Google 번역 (빠름)',
    translationMethodLLM: 'LLM 번역 (고품질 · 스트리밍 지원)',
    done: '완료',

    modelButton: '모델',
    apiConfig: '모델 설정',
    deepseekApiKey: 'DeepSeek API 키',
    openaiApiKey: 'OpenAI API 키',
    mainLlmProvider: '추론 모델',
    translationLlmProvider: '번역 모델',
    providerAuto: '자동',
    moreModelsHint: 'OpenAI, Claude 등 더 많은 모델을 사용하고 싶다면 GitHub에서 직접 배포하세요',

    leftColLabel: '원본 / 대상',
    rightColLabel: '처리 언어',

    inputPlaceholder: '무엇이든 물어보세요… (Enter로 전송, Shift+Enter로 줄바꿈)',
    inputHint: 'Enter로 전송 · Shift+Enter로 줄바꿈',

    translating: '번역 중…',
    thinking: '생각 중…',
    translatingOutput: '응답 번역 중…',
    emptyStateSame: '두 열은 동일한 내용입니다 (소스 언어 = 처리 언어)',
    emptyStateDiff: '왼쪽: 원본 언어  ·  오른쪽: 처리 언어',

    promptRouting: '스마트 프롬프트 라우팅',
    promptRoutingOn: '활성화',
    promptRoutingOff: '비활성화',
    promptRoutingHint: '각 메시지에 적합한 시스템 프롬프트를 자동으로 선택합니다',
    promptRoutingActive: '프롬프트 선택 중…',
    routingBadgePrefix: '템플릿:',
    refinedPromptLabel: '시스템 프롬프트',

    newChat: '새 대화',
    chatHistory: '대화 기록',
    deleteChat: '삭제',
    confirmDeleteTitle: '대화 삭제',
    confirmDeleteMessage: '이 대화를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    cancel: '취소',
    today: '오늘',
    yesterday: '어제',
    older: '이전',
    untitledChat: '제목 없는 대화',

    responseTypeLabels: {
      general:     '일반 — 일상적인 질문',
      creative:    '창의적 — 창의적인 응답',
      analytical:  '분석적 — 구조화된 추론',
      educational: '교육적 — 명확한 설명',
      technical:   '기술적 — 전문 용어',
    },
  },
};

export const getT = (sourceLanguage: string): UIText =>
  texts[sourceLanguage] ?? texts.english;
