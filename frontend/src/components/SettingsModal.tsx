import React from 'react';
import Select from 'react-select';
import { Language, ResponseType, ChatSettings } from '../types/chat';
import { getT } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChatSettings;
  onSettingsChange: (settings: ChatSettings) => void;
  languages: Language[];
  responseTypes: ResponseType[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  languages,
  responseTypes,
}) => {
  if (!isOpen) return null;

  const t = getT(settings.sourceLanguage);

  const translationMethodOptions = [
    { value: 'google', label: t.translationMethodGoogle },
    { value: 'llm',    label: t.translationMethodLLM },
  ];

  const languageOptions = languages.map(l => ({
    value: l.key,
    // Show native name; append English name in parens only when they differ
    label: l.native_name && l.native_name !== l.name
      ? `${l.native_name} (${l.name})`
      : (l.native_name || l.name),
  }));

  const responseTypeOptions = responseTypes.map(rt => ({
    value: rt.key,
    label: t.responseTypeLabels[rt.key] ?? `${rt.key} — ${rt.description}`,
  }));

  const update = (patch: Partial<ChatSettings>) =>
    onSettingsChange({ ...settings, ...patch });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">⚙ {t.settings}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Source language (= target language) */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{t.sourceLanguage}</label>
          <Select
            value={languageOptions.find(o => o.value === settings.sourceLanguage) ?? null}
            onChange={opt => opt && update({ sourceLanguage: opt.value })}
            options={languageOptions}
            isSearchable
            className="text-sm"
          />
        </div>

        {/* Processing language */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{t.processingLanguage}</label>
          <Select
            value={languageOptions.find(o => o.value === settings.processingLanguage) ?? null}
            onChange={opt => opt && update({ processingLanguage: opt.value })}
            options={languageOptions}
            isSearchable
            className="text-sm"
          />
        </div>

        {/* Response type */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{t.responseType}</label>
          <Select
            value={responseTypeOptions.find(o => o.value === settings.responseType) ?? null}
            onChange={opt => opt && update({ responseType: opt.value })}
            options={responseTypeOptions}
            className="text-sm"
          />
        </div>

        {/* Translation method */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{t.translationMethod}</label>
          <Select
            value={translationMethodOptions.find(o => o.value === settings.translationMethod) ?? null}
            onChange={opt => opt && update({ translationMethod: opt.value })}
            options={translationMethodOptions}
            className="text-sm"
          />
        </div>

        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
