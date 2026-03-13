import React, { useState } from 'react';
import Select from 'react-select';
import { ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';
import { useTheme, getSelectStyles } from '../utils/theme';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  allowUserApiKeys?: boolean;
  availableProviders?: string[];
}

type SelectOption = { value: string; label: string; isDisabled?: boolean };

// Per-provider model lists
const PROVIDER_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  openai:   ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  claude:   ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  gemini:   ['gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  qwen:     ['qwen-plus', 'qwen3-max', 'qwen3-max-thinking', 'qwen-turbo'],
};

// Translation LLM — lighter/cheaper models only
const TRANSLATION_PROVIDER_MODELS: Record<string, string[]> = {
  deepseek: ['deepseek-chat'],
  openai:   ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  claude:   ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  gemini:   ['gemini-3.1-pro-preview', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
  qwen:     ['qwen-plus'],
};

// API key rows (field name in apiKeys, display label, placeholder)
const API_KEY_ROWS: Array<{ field: keyof ChatSettings['apiKeys']; label: string; placeholder: string }> = [
  { field: 'deepseek',  label: 'DeepSeek', placeholder: 'sk-...' },
  { field: 'openai',    label: 'OpenAI',   placeholder: 'sk-...' },
  { field: 'anthropic', label: 'Claude',   placeholder: 'sk-ant-...' },
  { field: 'google',    label: 'Gemini',   placeholder: 'AIza...' },
  { field: 'qwen',      label: 'Qwen',     placeholder: 'sk-...' },
];

const EyeOffIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/>
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);

const ApiConfigModal: React.FC<ApiConfigModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  allowUserApiKeys = true,
  availableProviders = [],
}) => {
  const { isDark } = useTheme();
  const [visible, setVisible] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const t = getT(settings.sourceLanguage);
  const selectStyles = getSelectStyles(isDark);

  // Map provider → whether a usable key exists (server-configured or user-provided)
  const _userKeyMap: Record<string, string> = {
    deepseek: settings.apiKeys.deepseek ?? '',
    openai:   settings.apiKeys.openai ?? '',
    claude:   settings.apiKeys.anthropic ?? '',
    gemini:   settings.apiKeys.google ?? '',
    qwen:     settings.apiKeys.qwen ?? '',
  };
  const providerHasKey = (p: string) =>
    availableProviders.includes(p) || !!_userKeyMap[p];

  // All provider entries — disabled when no key is available
  const ALL_PROVIDERS: SelectOption[] = [
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'openai',   label: 'OpenAI' },
    { value: 'claude',   label: 'Claude' },
    { value: 'gemini',   label: 'Gemini' },
    { value: 'qwen',     label: 'Qwen' },
  ].map(o => ({ ...o, isDisabled: !providerHasKey(o.value) }));

  // When user keys are disallowed, only show server-configured providers
  const filteredProviders = allowUserApiKeys
    ? ALL_PROVIDERS
    : ALL_PROVIDERS.filter(o => availableProviders.includes(o.value));

  const mainProviderOptions: SelectOption[] = [
    { value: 'auto', label: t.providerAuto },
    ...filteredProviders,
  ];

  const transProviderOptions: SelectOption[] = [
    { value: 'auto', label: t.providerAuto },
    ...filteredProviders,
  ];

  const toggleVisible = (key: string) =>
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const updateApiKey = (field: keyof ChatSettings['apiKeys'], value: string) =>
    onSettingsChange({ ...settings, apiKeys: { ...settings.apiKeys, [field]: value } });

  // When provider changes, auto-select the first model for that provider
  const handleProviderChange = (
    role: 'mainLlm' | 'translationLlm',
    newProvider: string,
  ) => {
    const map = role === 'translationLlm' ? TRANSLATION_PROVIDER_MODELS : PROVIDER_MODELS;
    const model = newProvider === 'auto' ? '' : (map[newProvider]?.[0] ?? '');
    onSettingsChange({ ...settings, [role]: { provider: newProvider, model } });
  };

  const handleModelChange = (role: 'mainLlm' | 'translationLlm', model: string) =>
    onSettingsChange({ ...settings, [role]: { ...settings[role], model } });

  // Build model dropdown options for each role
  const modelOptions = (provider: string, role: 'mainLlm' | 'translationLlm' = 'mainLlm'): SelectOption[] => {
    const map = role === 'translationLlm' ? TRANSLATION_PROVIDER_MODELS : PROVIDER_MODELS;
    return (map[provider] ?? []).map(m => ({ value: m, label: m }));
  };

  const resolveModelValue = (role: 'mainLlm' | 'translationLlm'): SelectOption | null => {
    const { provider, model } = settings[role];
    if (provider === 'auto') return null;
    const opts = modelOptions(provider, role);
    return opts.find(o => o.value === model) ?? opts[0] ?? null;
  };

  const renderRoleRow = (
    role: 'mainLlm' | 'translationLlm',
    label: string,
    providerOpts: SelectOption[],
  ) => {
    const { provider } = settings[role];
    const isAuto = provider === 'auto';
    return (
      <div>
        <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
          {label}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Select
            styles={selectStyles}
            value={providerOpts.find(o => o.value === provider) ?? null}
            onChange={opt => opt && handleProviderChange(role, opt.value)}
            options={providerOpts}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
          <Select
            styles={selectStyles}
            value={resolveModelValue(role)}
            onChange={opt => opt && handleModelChange(role, opt.value)}
            options={modelOptions(provider, role)}
            isDisabled={isAuto}
            placeholder={isAuto ? 'Default' : '—'}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/55' : 'bg-black/25'} backdrop-blur-[3px]`}
      onClick={onClose}
    >
      <div
        className={`rounded-2xl border w-full max-w-md mx-4 overflow-y-auto max-h-[90vh] ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
        style={{
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px)',
          boxShadow: 'var(--modal-shadow)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <svg className={`w-4 h-4 ${isDark ? 'text-violet-400/80' : 'text-violet-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
            </svg>
            <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white/85' : 'text-slate-800'}`}>{t.apiConfig}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${isDark ? 'text-white/30 hover:text-white/70 hover:bg-white/[0.07]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">

          {/* ── LLM Roles ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-violet-400/80' : 'text-violet-600'}`}>
              LLM Roles
            </p>

            {/* Main LLM */}
            {renderRoleRow('mainLlm', t.mainLlmProvider, mainProviderOptions)}

            {/* Translation — method toggle + optional LLM row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
                  {t.translationLlmProvider}
                </label>
                {/* Google / LLM toggle */}
                <div className={`flex items-center rounded-lg border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}>
                  {(['google', 'llm'] as const).map(method => {
                    const active = settings.translationMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => onSettingsChange({ ...settings, translationMethod: method })}
                        className={`px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                          active
                            ? isDark ? 'bg-violet-500/25 text-violet-300' : 'bg-violet-100 text-violet-700'
                            : isDark ? 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {method === 'google' ? 'Google Translate' : 'LLM'}
                      </button>
                    );
                  })}
                </div>
              </div>
              {settings.translationMethod === 'llm' && (
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    styles={selectStyles}
                    value={transProviderOptions.find(o => o.value === settings.translationLlm.provider) ?? null}
                    onChange={opt => opt && handleProviderChange('translationLlm', opt.value)}
                    options={transProviderOptions}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                  <Select
                    styles={selectStyles}
                    value={resolveModelValue('translationLlm')}
                    onChange={opt => opt && handleModelChange('translationLlm', opt.value)}
                    options={modelOptions(settings.translationLlm.provider, 'translationLlm')}
                    isDisabled={settings.translationLlm.provider === 'auto'}
                    placeholder={settings.translationLlm.provider === 'auto' ? 'Default' : '—'}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── API Keys — only shown when user keys are allowed ── */}
          {allowUserApiKeys && (
          <div className="space-y-2">
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-violet-400/80' : 'text-violet-600'}`}>
              API Keys
            </p>
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/[0.08] divide-y divide-white/[0.06]' : 'border-slate-200 divide-y divide-slate-100'}`}>
              {API_KEY_ROWS.map(({ field, label, placeholder }) => (
                <React.Fragment key={field}>
                  {/* Key input row */}
                  <div className={`flex items-center gap-3 px-3 py-2.5 ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}>
                    <span className={`w-[58px] shrink-0 text-[12px] font-medium ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                      {label}
                    </span>
                    <input
                      type={visible.has(field) ? 'text' : 'password'}
                      value={settings.apiKeys[field] ?? ''}
                      onChange={e => updateApiKey(field, e.target.value)}
                      placeholder={placeholder}
                      className={`flex-1 min-w-0 bg-transparent text-[13px] outline-none ${isDark ? 'text-white/80 placeholder:text-white/18' : 'text-slate-700 placeholder:text-slate-300'}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisible(field)}
                      className={`shrink-0 transition-colors cursor-pointer ${isDark ? 'text-white/25 hover:text-white/55' : 'text-slate-300 hover:text-slate-500'}`}
                      aria-label={visible.has(field) ? 'Hide key' : 'Show key'}
                    >
                      {visible.has(field) ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full transition-colors ${
                        settings.apiKeys[field] ? 'bg-emerald-400' : isDark ? 'bg-white/15' : 'bg-slate-200'
                      }`}
                    />
                  </div>

                  {/* Qwen region toggle — integrated as a sub-row */}
                  {field === 'qwen' && (
                    <div className={`flex items-center gap-3 px-3 py-2 ${isDark ? 'bg-black/[0.12]' : 'bg-slate-50'}`}>
                      <span className={`w-[58px] shrink-0 text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
                        Qwen Region
                      </span>
                      <div className="flex items-center gap-4">
                        {(['cn', 'intl'] as const).map(region => {
                          const active = (settings.qwenRegion ?? 'cn') === region;
                          return (
                            <button
                              key={region}
                              type="button"
                              onClick={() => onSettingsChange({ ...settings, qwenRegion: region })}
                              className={`flex items-center gap-1.5 text-[12px] transition-colors cursor-pointer ${
                                active
                                  ? isDark ? 'text-violet-300' : 'text-violet-600'
                                  : isDark ? 'text-white/35 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? isDark ? 'bg-violet-400' : 'bg-violet-500' : isDark ? 'bg-white/20' : 'bg-slate-300'}`} />
                              {region === 'cn' ? '中国大陆' : 'International'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 space-y-3">
          {!allowUserApiKeys && (
            <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
              <svg className={`w-4 h-4 flex-shrink-0 mt-[1px] ${isDark ? 'text-white/30' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <p className={`text-[11.5px] leading-relaxed ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
                {t.moreModelsHint}{' '}
                <a
                  href="https://github.com/Sun-Yize/ThinkLingo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline underline-offset-2 transition-colors ${isDark ? 'text-violet-400/70 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}
                >
                  GitHub
                </a>
              </p>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-xl text-[14px] font-medium hover:from-violet-500 hover:to-violet-400 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-violet-500/20"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiConfigModal;
