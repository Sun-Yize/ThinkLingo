import React, { useState, useRef } from 'react';
import { getT } from '../utils/i18n';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
  sourceLanguage: string;
}

// Wrap "Shift+Enter" and "Enter" as styled <kbd> chips; keep surrounding text as-is.
// Works for all languages since they all use the English key names literally.
const renderHint = (hint: string) => {
  const parts = hint.split(/(Shift\+Enter|Enter)/g);
  return parts.map((part, i) => {
    if (part === 'Shift+Enter') {
      return (
        <kbd key={i} className="inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[9.5px] font-mono bg-white/[0.06] border border-white/[0.10] text-white/38 not-italic leading-none">
          ⇧↵
        </kbd>
      );
    }
    if (part === 'Enter') {
      return (
        <kbd key={i} className="inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[9.5px] font-mono bg-white/[0.06] border border-white/[0.10] text-white/38 not-italic leading-none">
          ↵
        </kbd>
      );
    }
    return (
      <span key={i} className="text-[11px] text-white/20 tracking-wide">
        {part}
      </span>
    );
  });
};

const InputBar: React.FC<InputBarProps> = ({ onSend, disabled, sourceLanguage }) => {
  const [message,   setMessage]   = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = getT(sourceLanguage);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const canSend = !disabled && message.trim().length > 0;

  return (
    <div className="relative flex-shrink-0 bg-[rgba(10,10,18,0.88)] backdrop-blur-xl px-5 py-4">

      {/* Top separator — dual-tone, matches header/column-header system */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.22) 50%, rgba(6,182,212,0.17) 50%, rgba(6,182,212,0.17) 100%)',
        }}
      />

      {/* Gradient border wrapper — 1 px padding acts as the border */}
      <div
        className="p-[1px] transition-all duration-300"
        style={{
          borderRadius: '24px',
          background: disabled
            ? 'rgba(255,255,255,0.05)'
            : isFocused
            ? 'linear-gradient(135deg, rgba(139,92,246,0.75) 0%, rgba(167,139,250,0.30) 45%, rgba(34,211,238,0.60) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(160,160,160,0.25) 50%, rgba(6,182,212,0.20) 100%)',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(124,58,237,0.10), 0 8px 32px rgba(124,58,237,0.14)'
            : '0 4px 20px rgba(0,0,0,0.30)',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {/* Inner surface */}
        <div className="flex items-end gap-3 rounded-[23px] bg-[#0D0D1C] px-5 py-3.5">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.inputPlaceholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-[15px] text-white/88 placeholder-white/22 py-[3px] max-h-[160px] leading-[1.6] disabled:cursor-not-allowed rounded-[8px]"
            style={{ fontWeight: 450 }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send"
            className={`
              flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full
              transition-all duration-200 cursor-pointer
              ${canSend
                ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white hover:from-violet-400 hover:to-violet-500 shadow-[0_4px_16px_rgba(124,58,237,0.40)] hover:shadow-[0_4px_24px_rgba(124,58,237,0.58)] active:scale-90'
                : 'bg-white/[0.05] text-white/15 cursor-not-allowed'
              }
            `}
          >
            {disabled ? (
              <div className="w-4 h-4 border-[1.5px] border-white/20 border-t-violet-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Keyboard shortcut hint with <kbd> chips */}
      <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
        {renderHint(t.inputHint)}
      </div>
    </div>
  );
};

export default InputBar;
