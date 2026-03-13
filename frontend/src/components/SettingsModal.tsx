import React from 'react';
import Select from 'react-select';
import { Language, ResponseType, ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';
import { useTheme, getSelectStyles } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  languages: Language[];
  responseTypes: ResponseType[];
}

type SelectOption = { value: string; label: string };

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  languages,
  responseTypes,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const t = getT(settings.sourceLanguage);
  const selectStyles = getSelectStyles(isDark);

  const translationMethodOptions: SelectOption[] = [
    { value: 'llm',    label: t.translationMethodLLM },
    { value: 'google', label: t.translationMethodGoogle },
  ];

  const languageOptions: SelectOption[] = languages.map(l => ({
    value: l.key,
    label: l.native_name && l.native_name !== l.name
      ? `${l.native_name} (${l.name})`
      : (l.native_name || l.name),
  }));

  const responseTypeOptions: SelectOption[] = responseTypes.map(rt => ({
    value: rt.key,
    label: t.responseTypeLabels[rt.key] ?? `${rt.key} — ${rt.description}`,
  }));

  const update = (patch: Partial<ChatSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${isDark ? 'bg-black/55' : 'bg-black/25'} backdrop-blur-[3px]`}
      onClick={onClose}
    >
      <div
        className={`rounded-2xl border w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh] ${isDark ? 'border-white/[0.08]' : 'border-slate-200'}`}
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <h2 className={`text-[15px] font-semibold ${isDark ? 'text-white/85' : 'text-slate-800'}`}>{t.settings}</h2>
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
        <div className="px-5 py-4 space-y-4">

          <div>
            <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
              {t.sourceLanguage}
            </label>
            <Select
              styles={selectStyles}
              value={languageOptions.find(o => o.value === settings.sourceLanguage) ?? null}
              onChange={opt => opt && update({ sourceLanguage: opt.value })}
              options={languageOptions}
              isSearchable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div>
            <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
              {t.processingLanguage}
            </label>
            <Select
              styles={selectStyles}
              value={languageOptions.find(o => o.value === settings.processingLanguage) ?? null}
              onChange={opt => opt && update({ processingLanguage: opt.value })}
              options={languageOptions}
              isSearchable
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div>
            <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
              {t.responseType}
            </label>
            <Select
              styles={selectStyles}
              value={responseTypeOptions.find(o => o.value === settings.responseType) ?? null}
              onChange={opt => opt && update({ responseType: opt.value })}
              options={responseTypeOptions}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div>
            <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
              {t.translationMethod}
            </label>
            <Select
              styles={selectStyles}
              value={translationMethodOptions.find(o => o.value === settings.translationMethod) ?? null}
              onChange={opt => opt && update({ translationMethod: opt.value })}
              options={translationMethodOptions}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          {/* Smart Prompt Routing toggle */}
          <div>
            <label className={`block text-[11px] font-medium mb-1.5 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-500'}`}>
              {t.promptRouting}
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className={`text-[12px] leading-snug ${isDark ? 'text-white/45' : 'text-slate-500'}`}>{t.promptRoutingHint}</span>
              <button
                onClick={() => update({ enablePromptRouting: !settings.enablePromptRouting })}
                aria-label={settings.enablePromptRouting ? t.promptRoutingOff : t.promptRoutingOn}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none ${
                  settings.enablePromptRouting
                    ? 'bg-violet-600'
                    : isDark ? 'bg-white/[0.10]' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    settings.enablePromptRouting ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className={`mt-1.5 text-[11px] ${isDark ? 'text-white/25' : 'text-slate-400'}`}>
              {settings.enablePromptRouting ? t.promptRoutingOn : t.promptRoutingOff}
            </p>
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

export default SettingsModal;
