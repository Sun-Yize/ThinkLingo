import React, { useState } from 'react';
import Select, { StylesConfig } from 'react-select';
import { ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
}

type SelectOption = { value: string; label: string };

const selectDarkStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: state.isFocused ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.10)',
    borderRadius: '10px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(124,58,237,0.14)' : 'none',
    minHeight: '38px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    '&:hover': { borderColor: 'rgba(255,255,255,0.20)' },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#181828',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
    overflow: 'hidden',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgba(124,58,237,0.28)'
      : state.isFocused
        ? 'rgba(255,255,255,0.06)'
        : 'transparent',
    color: state.isSelected ? '#c4b5fd' : 'rgba(255,255,255,0.78)',
    fontSize: '14px',
    padding: '8px 10px',
    borderRadius: '7px',
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'rgba(255,255,255,0.85)',
    fontSize: '14px',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgba(255,255,255,0.28)',
    fontSize: '14px',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'rgba(255,255,255,0.10)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'rgba(255,255,255,0.28)',
    '&:hover': { color: 'rgba(255,255,255,0.55)' },
  }),
  input: (base) => ({
    ...base,
    color: 'rgba(255,255,255,0.85)',
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'rgba(255,255,255,0.28)',
    '&:hover': { color: 'rgba(255,255,255,0.55)' },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const PROVIDERS = [
  { key: 'deepseek' as const, label: 'DeepSeek', placeholder: 'sk-...' },
  { key: 'openai'   as const, label: 'OpenAI',   placeholder: 'sk-...' },
];

// SVG icons extracted to avoid repetition
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
}) => {
  const [visible, setVisible] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const t = getT(settings.sourceLanguage);

  const mainLlmOptions: SelectOption[] = [
    { value: 'auto',     label: t.providerAuto },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'openai',   label: 'OpenAI (gpt-4o-mini)' },
  ];

  const translationLlmOptions: SelectOption[] = [
    { value: 'auto',     label: t.providerAuto },
    { value: 'gpt35',    label: 'OpenAI (gpt-3.5-turbo)' },
    { value: 'openai',   label: 'OpenAI (gpt-4o-mini)' },
    { value: 'deepseek', label: 'DeepSeek' },
  ];

  const toggleVisible = (key: string) =>
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const updateApiKey = (key: 'deepseek' | 'openai', value: string) =>
    onSettingsChange({ ...settings, apiKeys: { ...settings.apiKeys, [key]: value } });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="rounded-2xl border border-white/[0.08] w-full max-w-sm mx-4 overflow-hidden"
        style={{
          background: 'rgba(18,18,30,0.92)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-violet-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
            </svg>
            <h2 className="text-[15px] font-semibold text-white/85">{t.apiConfig}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {/* Provider Keys */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-violet-400/80 uppercase tracking-wider mb-2">
              Provider Keys
            </p>
            <div className="rounded-xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.06]">
              {PROVIDERS.map(({ key, label, placeholder }) => (
                <div key={key} className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.02]">
                  {/* Provider name */}
                  <span className="w-[72px] shrink-0 text-[12px] font-medium text-white/50">
                    {label}
                  </span>
                  {/* Key input */}
                  <input
                    type={visible.has(key) ? 'text' : 'password'}
                    value={settings.apiKeys[key]}
                    onChange={e => updateApiKey(key, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 min-w-0 bg-transparent text-white/80 text-[13px] outline-none placeholder:text-white/18"
                  />
                  {/* Show/hide toggle */}
                  <button
                    type="button"
                    onClick={() => toggleVisible(key)}
                    className="shrink-0 text-white/25 hover:text-white/55 transition-colors cursor-pointer"
                    aria-label={visible.has(key) ? 'Hide key' : 'Show key'}
                  >
                    {visible.has(key) ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  {/* Status dot */}
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full transition-colors ${
                      settings.apiKeys[key] ? 'bg-emerald-400' : 'bg-white/15'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* LLM Assignment */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-violet-400/80 uppercase tracking-wider">
              LLM Assignment
            </p>
            <div>
              <label className="block text-[11px] font-medium text-white/35 mb-1.5 uppercase tracking-wider">
                {t.mainLlmProvider}
              </label>
              <Select
                styles={selectDarkStyles}
                value={mainLlmOptions.find(o => o.value === settings.mainLlmProvider) ?? null}
                onChange={opt => opt && onSettingsChange({ ...settings, mainLlmProvider: opt.value as ChatSettings['mainLlmProvider'] })}
                options={mainLlmOptions}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-white/35 mb-1.5 uppercase tracking-wider">
                {t.translationLlmProvider}
              </label>
              <Select
                styles={selectDarkStyles}
                value={translationLlmOptions.find(o => o.value === settings.translationLlmProvider) ?? null}
                onChange={opt => opt && onSettingsChange({ ...settings, translationLlmProvider: opt.value as ChatSettings['translationLlmProvider'] })}
                options={translationLlmOptions}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
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
