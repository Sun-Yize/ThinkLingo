import React, { useState, useRef } from 'react';
import { getT } from '../utils/i18n';
import { useTheme } from '../utils/theme';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
  sourceLanguage: string;
  sidebarOpen?: boolean;
  noApiKey?: boolean;
  onApiKeyClick?: () => void;
}

const InputBar: React.FC<InputBarProps> = ({ onSend, disabled, sourceLanguage, sidebarOpen = false, noApiKey = false, onApiKeyClick }) => {
  const { isDark } = useTheme();
  const [message,   setMessage]   = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);  // track IME composition state
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
    // Block send during IME composition (e.g. pinyin selecting a character with Enter)
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current && !e.nativeEvent.isComposing) {
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

  // Wrap "Shift+Enter" and "Enter" as styled <kbd> chips
  const renderHint = (hint: string) => {
    const parts = hint.split(/(Shift\+Enter|Enter)/g);
    return parts.map((part, i) => {
      if (part === 'Shift+Enter') {
        return (
          <kbd key={i} className={`inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[9.5px] font-mono not-italic leading-none border ${isDark ? 'bg-white/[0.06] border-white/[0.10] text-white/38' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
            ⇧↵
          </kbd>
        );
      }
      if (part === 'Enter') {
        return (
          <kbd key={i} className={`inline-flex items-center px-1.5 py-[2px] rounded-[5px] text-[9.5px] font-mono not-italic leading-none border ${isDark ? 'bg-white/[0.06] border-white/[0.10] text-white/38' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
            ↵
          </kbd>
        );
      }
      return (
        <span key={i} className={`text-[11px] tracking-wide ${isDark ? 'text-white/20' : 'text-slate-400'}`}>
          {part}
        </span>
      );
    });
  };

  return (
    <div
      className="relative flex-shrink-0 backdrop-blur-xl px-2.5 py-2 md:px-5 md:py-4 flex flex-col items-center"
      style={{ background: 'var(--input-area-bg)', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >

      {/* Top separator — dual-tone, matches header/column-header system */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'var(--sep-input)' }}
      />

      {/* Gradient border wrapper — 1 px padding acts as the border */}
      <div
        className={`w-full p-[1px] transition-all duration-300 ${sidebarOpen ? 'max-w-6xl' : 'max-w-[92%]'}`}
        style={{
          borderRadius: '24px',
          background: disabled
            ? 'var(--input-border-disabled)'
            : isFocused
            ? 'var(--input-border-focus)'
            : 'var(--input-border-idle)',
          boxShadow: isFocused
            ? 'var(--input-shadow-focus)'
            : 'var(--input-shadow-idle)',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {/* Inner surface */}
        <div className="flex items-center gap-2 md:gap-3 rounded-[23px] px-3 py-2.5 md:px-5 md:py-3.5" style={{ background: 'var(--input-inner-bg)' }}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => {
              requestAnimationFrame(() => { composingRef.current = false; });
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.inputPlaceholder}
            disabled={disabled}
            rows={1}
            className={`flex-1 bg-transparent resize-none outline-none text-[14px] md:text-[15px] py-[3px] max-h-[160px] leading-[1.6] disabled:cursor-not-allowed rounded-[8px] ${
              isDark ? 'text-white/88 placeholder-white/22' : 'text-slate-800 placeholder-slate-400'
            }`}
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
                : isDark
                  ? 'bg-white/[0.05] text-white/15 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }
            `}
          >
            {disabled ? (
              <div className={`w-4 h-4 border-[1.5px] rounded-full animate-spin ${isDark ? 'border-white/20 border-t-violet-400' : 'border-slate-200 border-t-violet-500'}`} />
            ) : (
              <svg className="w-4 h-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* API key prompt or keyboard shortcut hint */}
      {noApiKey ? (
        <button
          onClick={onApiKeyClick}
          className="flex items-center justify-center gap-1.5 mt-2 md:mt-2.5 text-[11px] md:text-[12px] text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"/>
          </svg>
          <span>{t.noApiKeyPrompt}</span>
        </button>
      ) : (
        <div className="hidden md:flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
          {renderHint(t.inputHint)}
        </div>
      )}
    </div>
  );
};

export default InputBar;
